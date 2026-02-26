
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import api from '../lib/axios';
import { MousePointer2, ShoppingCart, DollarSign, Wallet, ExternalLink, Package, RefreshCw } from 'lucide-react';


const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/* ─────────────────────────────────────────────
   Clean image URLs — strip HTML entities and
   stray encoded quotes that break the URL
───────────────────────────────────────────── */
function cleanImageUrl(url) {
  if (!url) return '';
  return url
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '')
    .replace(/%26quot%3B/gi, '')
    .replace(/["']/g, '')
    .replace(/[,;\s]+$/g, '')
    .trim();
}

/* ─────────────────────────────────────────────
   ProductImage — uses direct URL (no proxy)
───────────────────────────────────────────── */
const ProductImage = ({ src, alt }) => {
  const [imgSrc, setImgSrc] = useState('');

  useEffect(() => {
    setImgSrc(cleanImageUrl(src));
  }, [src]);

  if (!imgSrc) {
    return (
      <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-200">
        <Package size={24} className="text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt || 'Product'}
      referrerPolicy="no-referrer"
      className="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0 bg-slate-100"
      onError={() => {
        setImgSrc('');
      }}
    />
  );
};

/* ─────────────────────────────────────────────
   Dashboard
───────────────────────────────────────────── */
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rescraping, setRescraping] = useState(false);
  const [rescrapeMsg, setRescrapeMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const query = `
        query {
          me {
            name
            stats {
              totalClicks
              lifetimeCommission
              pendingCommission
              approvedCommission
              paidCommission
              totalOrders
            }
            links(limit: 20) {
              shortCode
              originalUrl
              publicUrl
              platform
              productTitle
              productImage
              clicks
              createdAt
            }
          }
        }
      `;
      const res = await api.post('/graphql', { query });
      setStats(res.data.data.me);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleRescrape = async () => {
    setRescraping(true);
    setRescrapeMsg('');
    try {
      const res = await api.post('/links/rescrape');
      setRescrapeMsg(res.data.message || 'Rescrape done!');
      // Refresh to show updated images
      await fetchStats();
    } catch (err) {
      setRescrapeMsg(err.response?.data?.error || 'Rescrape failed');
    } finally {
      setRescraping(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-slate-500">Loading dashboard...</div>
    </div>
  );

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <div className="ml-64 p-8 w-full">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Welcome, {stats?.name} 👋</h1>
            <p className="text-slate-500 mt-1">Here's your performance overview.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRescrape}
              disabled={rescraping || refreshing}
              title="Fetch product images for links missing them"
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={rescraping ? 'animate-spin' : ''} />
              {rescraping ? 'Fetching images...' : 'Rescrape Images'}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing || rescraping}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        {/* ── Rescrape status message ── */}
        {rescrapeMsg && (
          <div className="mb-4 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-lg">
            {rescrapeMsg}
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Clicks"    value={stats?.stats?.totalClicks || 0}                icon={<MousePointer2 size={24} className="text-blue-600" />}   color="bg-blue-50" />
          <StatCard title="Total Orders"    value={stats?.stats?.totalOrders || 0}                icon={<ShoppingCart  size={24} className="text-purple-600" />}  color="bg-purple-50" />
          <StatCard title="Pending Comm."   value={`₹${stats?.stats?.pendingCommission || 0}`}   icon={<DollarSign    size={24} className="text-amber-600" />}   color="bg-amber-50" />
          <StatCard title="Approved Comm."  value={`₹${stats?.stats?.approvedCommission || 0}`}  icon={<Wallet        size={24} className="text-green-600" />}   color="bg-green-50" />
        </div>

        {/* ── Links Section ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Your Links</h2>
          <span className="text-xs text-slate-400">{stats?.links?.length || 0} links</span>
        </div>

        <div className="grid gap-4">
          {stats?.links?.map((link) => (
            <div key={link.shortCode} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition">
              <div className="flex items-start gap-4">

                {/* ── Product Image (always rendered, falls back to icon on error) ── */}
                <ProductImage src={link.productImage} alt={link.productTitle} />

                {/* ── Link Details ── */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800 truncate">
                        {link.productTitle || 'Product Link'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{link.originalUrl}</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium flex-shrink-0">
                      {link.clicks} clicks
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 pr-2">
                      <a
                        href={link.publicUrl || `${BACKEND}/share/${link.shortCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded"
                        title="Open Short Link"
                      >
                        <ExternalLink size={14} />
                        {link.shortCode}
                      </a>
                      <button 
                        onClick={() => {
                          const fullLink = link.publicUrl || `${BACKEND}/share/${link.shortCode}`;
                          navigator.clipboard.writeText(fullLink);
                          alert('Copied: ' + fullLink);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-md transition-all"
                        title="Copy Short Link"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      </button>
                    </div>
                    
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{link.platform}</span>
                    {link.createdAt && (
                      <span className="text-xs text-slate-400">
                        • {new Date(link.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ))}

          {(!stats?.links || stats.links.length === 0) && (
            <div className="text-center py-16 text-slate-400">
              <Package size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No links yet.</p>
              <p className="text-sm mt-1">Generate your first link from the Link Generator!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
