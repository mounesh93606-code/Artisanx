import { useEffect, useState } from 'react';
import { Users, AlertTriangle, Package, MessageSquare, Star, Clock, ShieldAlert, ChevronRight, Bell, Menu } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

import { LanguageSwitcher } from '../../components/layout/LanguageSwitcher';

export default function FacilitatorHome() {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, actRes] = await Promise.all([
          api.get(`/facilitator/stats`),
          api.get(`/facilitator/activity`)
        ]);
        
        setStats(statsRes.data);
        setActivities((actRes.data.activities || []).slice(0, 3)); // 3 recent
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchData();
  }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest"><div className="animate-pulse w-8 h-8 rounded-full bg-stone-300"></div></div>;
  }

  return (
    <div className="w-full relative pb-24 bg-surface-container-lowest text-on-surface min-h-screen">
      <div className="bg-surface px-6 pt-12 pb-4 sticky top-0 z-10 border-b border-outline-variant/30 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <Menu className="w-6 h-6 text-stone-600" />
          <div className="flex items-center gap-1 font-bold text-xl text-stone-800 tracking-tight">
            <span className="text-primary">🌿</span> ArtisanX
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button onClick={() => navigate('/facilitator/notifications')} className="relative p-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-surface"></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-container overflow-hidden cursor-pointer" onClick={() => navigate('/facilitator/profile')}>
            {user?.profile_photo_url ? (
              <img src={user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary font-bold text-sm">
                {user?.display_name?.charAt(0) || 'F'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div>
          <div className="text-sm text-stone-500 mb-1">Good morning,</div>
          <div className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            {user?.display_name || 'Facilitator'} <span className="text-xl">👋</span>
          </div>
          <div className="text-sm text-stone-500 font-bold mt-1">Facilitator</div>
        </div>

        {/* Quote */}
        <div className="bg-green-50 p-4 rounded-3xl border border-green-100/50 text-green-800 italic text-center font-medium shadow-sm">
          "Support artisans. Build trust.<br/>Stronger craft communities."
        </div>

        {/* Stats Grid matching the 3x2 layout */}
        <div className="grid grid-cols-3 gap-3">
          <div onClick={() => navigate('/facilitator/artisans')} className="bg-surface p-4 rounded-3xl shadow-sm border border-outline-variant/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-stone-800 leading-none">{stats?.total_artisans || 0}</div>
            <div className="text-[10px] text-stone-500 font-bold text-center leading-tight">Artisans<br/>Supported</div>
          </div>
          
          <div onClick={() => navigate('/facilitator/reviews')} className="bg-surface p-4 rounded-3xl shadow-sm border border-outline-variant/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all">
             <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <Star className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-stone-800 leading-none">{stats?.draft_products || 0}</div>
            <div className="text-[10px] text-stone-500 font-bold text-center leading-tight">Products<br/>To Review</div>
          </div>

          <div onClick={() => navigate('/facilitator/support')} className="bg-surface p-4 rounded-3xl shadow-sm border border-outline-variant/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-stone-800 leading-none">{stats?.open_support_requests || 0}</div>
            <div className="text-[10px] text-stone-500 font-bold text-center leading-tight">Open Support<br/>Requests</div>
          </div>

          <div onClick={() => navigate('/facilitator/disputes')} className="bg-surface p-4 rounded-3xl shadow-sm border border-outline-variant/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-stone-800 leading-none">{stats?.open_disputes || 0}</div>
            <div className="text-[10px] text-stone-500 font-bold text-center leading-tight">Open<br/>Disputes</div>
          </div>

          <div onClick={() => navigate('/facilitator/orders')} className="bg-surface p-4 rounded-3xl shadow-sm border border-outline-variant/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all">
             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Package className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-stone-800 leading-none">{stats?.active_orders ?? 0}</div>
            <div className="text-[10px] text-stone-500 font-bold text-center leading-tight">Active<br/>Orders</div>
          </div>

          <div onClick={() => navigate('/facilitator/orders')} className="bg-surface p-4 rounded-3xl shadow-sm border border-outline-variant/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-stone-800 leading-none">{stats?.delayed_orders || 0}</div>
            <div className="text-[10px] text-stone-500 font-bold text-center leading-tight">Delayed<br/>Orders</div>
          </div>
        </div>

        {/* Recent Activity */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-stone-800">Recent Activity</h2>
            <button onClick={() => navigate('/facilitator/activity')} className="text-xs font-bold text-primary flex items-center hover:underline">
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </button>
          </div>
          
          <div className="bg-surface rounded-3xl shadow-sm border border-outline-variant/50 p-4 space-y-4">
            {activities.length === 0 ? (
               <div className="text-center text-stone-500 py-4 text-sm">No recent activity.</div>
            ) : (
              activities.map((act, idx) => (
                <div key={act.id || idx} className="flex gap-4 items-start pb-4 border-b border-outline-variant/30 last:border-0 last:pb-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    act.action_type === 'support' ? 'bg-blue-100 text-blue-600' :
                    act.action_type === 'dispute_resolved' ? 'bg-red-100 text-red-600' :
                    act.action_type === 'verification_changed' ? 'bg-green-100 text-green-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {act.action_type === 'support' ? <MessageSquare className="w-5 h-5" /> : 
                     act.action_type === 'verification_changed' ? <ShieldAlert className="w-5 h-5" /> :
                     <Package className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-stone-800 text-sm line-clamp-1">
                      {act.action_type.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-xs text-stone-500 line-clamp-1">{act.details || 'System update'}</p>
                    <div className="text-[10px] text-stone-400 mt-1">
                      {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
