
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../lib/axios';
import { Copy, ArrowRight, ExternalLink } from 'lucide-react';

const LinkGenerator = () => {
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortLink, setShortLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShortLink(null);
    try {
      const res = await api.post('/links/create', { originalUrl, platform: 'admitad' });
      setShortLink(res.data);
    } catch (err) {
      console.error('Link generation error:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (shortLink) {
      navigator.clipboard.writeText(shortLink.oneInfoLink);
      alert('Copied to clipboard!');
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <div className="ml-64 p-8 w-full">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">Link Generator</h1>
        
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 max-w-2xl">
          <form onSubmit={generateLink} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Product URL (Lifestyle / Flipkart / Amazon)</label>
              <input
                type="url"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                placeholder="https://www.lifestylestores.com/in/en/..."
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Generating...' : 'Generate Magic Link'}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {error && <div className="mt-4 text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

          {shortLink && (
            <div className="mt-8 p-5 bg-green-50 border border-green-200 rounded-xl">
              {/* Product Preview */}
              {shortLink.productImage && (
                <div className="flex items-start gap-4 mb-4 pb-4 border-b border-green-200">
                  <img
                    src={shortLink.productImage.replace(/&quot;/g, '').replace(/%26quot%3B/gi, '').replace(/["']/g, '').trim()}
                    alt={shortLink.productTitle || 'Product'}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 object-cover rounded-lg border border-green-200"
                    onError={(e) => { 
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/80x80?text=Product'; 
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                      {shortLink.productTitle || 'Product Link'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <ExternalLink size={12} />
                      {shortLink.platform}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-sm text-green-800 font-medium mb-2">Generated Short Link:</p>
              <div className="flex items-center space-x-2 bg-white p-2 rounded border border-green-200 mb-4">
                <input
                  readOnly
                  value={shortLink.oneInfoLink || ''}
                  className="w-full bg-transparent outline-none text-blue-600 font-mono text-sm font-bold"
                />
                <button onClick={copyToClipboard} className="text-blue-600 hover:text-blue-700 p-1 bg-blue-50 rounded">
                  <Copy size={18} />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Platform: <span className="font-bold text-slate-700 uppercase">{shortLink.platform}</span></span>
                <span>Shortcode: <span className="font-mono font-bold text-blue-600 px-2 py-0.5 bg-blue-50 rounded">{shortLink.shortCode}</span></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkGenerator;
