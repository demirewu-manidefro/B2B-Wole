import React, { useState, useEffect } from 'react';
import { Truck, Plus, Users, MapPin, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export default function FreightPoolView({ currentPersona, onOpenCreatePool, showToast }) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinData, setJoinData] = useState({}); // poolId -> { volume_cbm: 2, weight_kg: 50 }

  const fetchPools = async () => {
    setLoading(true);
    try {
      const data = await api.getFreightPools();
      setPools(data.pools || []);
    } catch (err) {
      showToast(`❌ Failed to load freight pools: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, [currentPersona.id]);

  const handleJoin = async (poolId) => {
    const input = joinData[poolId] || { volume_cbm: 2, weight_kg: 50 };
    try {
      const res = await api.joinFreightPool(poolId, Number(input.volume_cbm), Number(input.weight_kg));
      showToast(`🚚 Joined Isuzu Freight Pool! Your recalculated split rate is ${res.your_share} ETB (Total pooled CBM: ${res.new_total_cbm}).`, 'success');
      fetchPools();
    } catch (err) {
      showToast(`❌ Failed to join pool: ${err.message}`, 'danger');
    }
  };

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span>🚚 Shared Isuzu Freight Consolidation & Rate Pooling</span>
            <span className="bg-ali-gold/20 text-ali-gold text-xs px-3 py-1 rounded-full border border-ali-gold/40 uppercase font-mono">
              Section 2.4 Logistics Engine
            </span>
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Micro-retailers sharing geographical delivery footprints within temporal windows can join consolidation pools to split commercial vehicle rental rates!
          </p>
        </div>

        <button className="btn btn-gold" onClick={onOpenCreatePool}>
          <Plus size={18} />
          <span>Create Consolidation Pool</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted font-mono animate-pulse">⚡ Loading Freight Consolidation Routes...</div>
      ) : pools.length === 0 ? (
        <div className="bg-bg-card border border-border-glass rounded-2xl p-12 text-center text-text-muted">
          <Truck size={48} className="mx-auto mb-3 text-ali-gold opacity-50" />
          <h3 className="text-lg font-bold text-white mb-1">No Active Isuzu Freight Pools</h3>
          <p className="text-sm">Create a new consolidation route to start splitting delivery costs!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pools.map((pool) => {
            const currentCbm = Number(pool.current_cbm || 0);
            const maxCbm = Number(pool.max_capacity_cbm || 15);
            const progressPct = Math.min(100, Math.round((currentCbm / maxCbm) * 100));
            const memberCount = pool.member_count ? Number(pool.member_count) : (pool.members ? pool.members.length : 1);
            const estimatedSplit = Math.round(Number(pool.cost_per_cbm || pool.total_vehicle_cost / maxCbm) * 2);

            return (
              <div key={pool.id} className="bg-bg-card border border-border-glass rounded-2xl p-6 flex flex-col justify-between hover:border-ali-gold/50 transition-all shadow-lg">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-ali-gold font-bold text-sm bg-bg-main px-3 py-1 rounded-full border border-border-glass">
                      🚚 Route #{pool.id}: {pool.origin} ➔ {pool.destination}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded font-extrabold uppercase ${pool.status === 'Open' ? 'bg-accent-emerald text-black' : 'bg-bg-secondary text-text-muted'}`}>
                      {pool.status}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">{pool.vehicle_type} (Capacity: {maxCbm} CBM)</h3>
                  <div className="flex items-center gap-4 text-xs text-text-muted mb-4 font-mono">
                    <span className="flex items-center gap-1"><Calendar size={13}/> Depart: {new Date(pool.departure_date || Date.now()).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Users size={13}/> {memberCount} Retailers Joined</span>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="bg-bg-main p-3 rounded-xl border border-border-glass mb-4">
                    <div className="flex justify-between text-xs font-bold text-text-muted mb-1 font-mono">
                      <span>Cargo Footprint Loaded:</span>
                      <span className="text-white">{currentCbm} / {maxCbm} CBM ({progressPct}%)</span>
                    </div>
                    <div className="w-full bg-bg-secondary h-2.5 rounded-full overflow-hidden border border-border-glass">
                      <div className="bg-ali-gold h-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="bg-bg-secondary p-4 rounded-xl border border-border-glass mb-4 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-text-muted">Total Commercial Vehicle Rental:</div>
                      <div className="text-lg font-extrabold text-white font-mono">{Number(pool.total_vehicle_cost).toLocaleString()} ETB</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-ali-gold font-bold">Estimated 2 CBM Share Split:</div>
                      <div className="text-lg font-extrabold text-ali-red font-mono">~{estimatedSplit.toLocaleString()} ETB</div>
                    </div>
                  </div>
                </div>

                {/* Join Form */}
                {pool.status === 'Open' && (
                  <div className="border-t border-border-glass pt-4 mt-2">
                    <div className="text-xs font-bold text-text-muted mb-2 flex items-center justify-between">
                      <span>Enter Your Cargo Volume to Join & Split Cost:</span>
                      <span className="text-ali-gold font-mono">Rate/CBM: {Number(pool.cost_per_cbm || pool.total_vehicle_cost / maxCbm).toFixed(0)} ETB</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="CBM (e.g. 2)" 
                        className="form-input !py-2 !text-xs font-mono w-28"
                        value={(joinData[pool.id] || {}).volume_cbm || 2}
                        onChange={(e) => setJoinData({ ...joinData, [pool.id]: { ...(joinData[pool.id] || {}), volume_cbm: e.target.value } })}
                      />
                      <input 
                        type="number" 
                        placeholder="Weight Kg" 
                        className="form-input !py-2 !text-xs font-mono w-28"
                        value={(joinData[pool.id] || {}).weight_kg || 50}
                        onChange={(e) => setJoinData({ ...joinData, [pool.id]: { ...(joinData[pool.id] || {}), weight_kg: e.target.value } })}
                      />
                      <button 
                        className="btn btn-red flex-1 !py-2 !text-xs font-extrabold"
                        onClick={() => handleJoin(pool.id)}
                      >
                        <span>Join & Split Cost 🚚</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
