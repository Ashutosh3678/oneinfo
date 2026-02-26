import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { CATEGORIES } from '../data/brands';
import { LayoutGrid, ArrowRight } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <div className="ml-64 p-8 w-full">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <LayoutGrid className="text-blue-600" size={32} />
            Explore Brands
          </h1>
          <p className="text-slate-500 mt-2">Select a category to find products and generate affiliate links.</p>
        </header>

        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Popular Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {CATEGORIES.map((cat) => (
              <div 
                key={cat.id}
                onClick={() => navigate(cat.path)}
                className="group cursor-pointer bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={cat.image} 
                    alt={cat.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.src = 'https://placehold.co/600x400?text=' + cat.name }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-2xl font-bold tracking-tight">{cat.name}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    {cat.description}
                  </p>
                  <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:gap-2 transition-all">
                    Browse Brands
                    <ArrowRight size={16} className="ml-1 opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-blue-600 rounded-3xl p-10 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-bold mb-4">How it works?</h2>
            <ol className="space-y-4 text-blue-100">  
              <li className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">1</span>
                <div>
                  <p className="font-semibold text-white">Choose a Brand</p>
                  <p className="text-sm">Browse our curated list of partner brands in your favorite categories.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">2</span>
                <div>
                  <p className="font-semibold text-white">Find a Product</p>
                  <p className="text-sm">Explore the brand's store, find a product you love, and copy its URL.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">3</span>
                <div>
                  <p className="font-semibold text-white">Generate & Share</p>
                  <p className="text-sm">Paste the link in the Generator to get your unique affiliate link and start earning!</p>
                </div>
              </li>
            </ol>
          </div>
          {/* Decorative background circle */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/10 rounded-full blur-2xl" />
        </section>
      </div>
    </div>
  );
};

export default Home;
