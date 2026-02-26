import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { BRANDS, CATEGORIES } from '../data/brands';
import { ExternalLink, ArrowLeft } from 'lucide-react';

const BrandCategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
 
  const category = CATEGORIES.find(c => c.id === categoryId);
  const brands = BRANDS[categoryId] || []
  if (!category) {
    return (
      <div className="flex bg-slate-50 min-h-screen">
        <Sidebar />
        <div className="ml-64 p-8 w-full text-center">
            <h1 className="text-2xl font-bold">Category not found</h1>
            <button onClick={() => navigate('/')} className="text-blue-600 mt-4">Go Back Home</button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <div className="ml-64 p-8 w-full">
        <header className="mb-8">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-4 text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Back to Categories
          </button>
          <h1 className="text-3xl font-bold text-slate-800 capitalize flex items-center gap-3">
             {category.name.trim()}
          </h1>
          <p className="text-slate-500 mt-2">{category.description}</p>
        </header>

        {brands.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {brands.map((brand) => (
              <div 
                key={brand.name}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center hover:shadow-lg transition-all group"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 p-2 border border-slate-100 group-hover:bg-white transition-colors">
                  <img 
                    src={brand.logo} 
                    alt={brand.name} 
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => { 
                      e.target.src = 'https://placehold.co/100x100?text=' + brand.name;
                    }}
                  />
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-2">{brand.name}</h3>
                <p className="text-slate-500 text-sm mb-6 flex-grow">{brand.description}</p>
                
                <a 
                  href={brand.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-blue-600 transition-colors font-semibold text-sm"
                >
                  Visit Store
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-400">No brands found in this category yet.</p>
          </div>
        )
        }
        <div className="mt-12 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="p-2 bg-amber-200 rounded-xl text-amber-700">
            <ExternalLink size={20} />
          </div>
          <div>
            <h4 className="font-bold text-amber-900">Pro Tip</h4>
            <p className="text-amber-800 text-sm mt-1">
              Once you find a product on the brand's store, copy the URL from the browser's address bar and paste it into the 
              <strong> <a href="/links" className="underline decoration-amber-400 hover:text-blue-600 transition-colors">Link Generator</a></strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default BrandCategoryPage;
