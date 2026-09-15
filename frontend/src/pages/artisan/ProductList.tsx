import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, ArrowLeft, Copy, Eye } from 'lucide-react';
import api from '../../lib/api';
import BottomNav from '../../components/BottomNav';

export default function ProductList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'published' | 'draft'>('all');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [tab]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const statusParam = tab === 'all' ? '' : `?status=${tab}`;
      const { data } = await api.get(`/products/my${statusParam}`);
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/products/${id}/duplicate`);
      fetchProducts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id?: string) => {
    const targetId = id || deleteId;
    if (!targetId) return;
    try {
      await api.delete(`/products/${targetId}`);
      setDeleteId(null);
      fetchProducts();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full pb-20 relative bg-brand-bg min-h-screen">
      {/* Top Bar */}
      <div className="bg-surface px-6 py-4 border-b border-outline-variant flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/artisan')} className="p-2 -ml-2 text-stone-600 hover:text-stone-900">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-lg">{t('products.title')}</h1>
        <div className="w-8" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant bg-surface px-6">
        <button 
          className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${tab === 'all' ? 'border-primary text-primary' : 'border-transparent text-stone-500'}`}
          onClick={() => setTab('all')}
        >
          {t('products.all')} ({products.length})
        </button>
        <button 
          className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${tab === 'published' ? 'border-primary text-primary' : 'border-transparent text-stone-500'}`}
          onClick={() => setTab('published')}
        >
          {t('products.published')}
        </button>
        <button 
          className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${tab === 'draft' ? 'border-primary text-primary' : 'border-transparent text-stone-500'}`}
          onClick={() => setTab('draft')}
        >
          {t('products.drafts')}
        </button>
      </div>

      {/* List */}
      <div className="p-6 space-y-4 w-full">
        {loading ? (
          <div className="text-center py-10 text-stone-500">{t('common.loading')}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-stone-200 rounded-full mx-auto mb-4 flex items-center justify-center">
               <span className="text-3xl text-stone-400">📦</span>
            </div>
            <p className="text-stone-500 font-medium">{t('products.no_products')}</p>
          </div>
        ) : (
          products.map(product => (
            <div 
              key={product.id} 
              className="bg-surface rounded-2xl p-4 shadow-sm border border-outline-variant flex gap-4 items-center relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/artisan/products/${product.id}`)}
            >
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-xl bg-stone-100 flex-shrink-0 overflow-hidden">
                {product.main_image ? (
                  <img 
                    src={product.main_image} 
                    alt={product.title} 
                    className="w-full h-full object-cover" 
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs text-center p-1">{t('common.no_image')}</div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-base truncate">{product.title || 'Untitled'}</h3>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${product.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'}`}>
                    {product.status === 'published' ? t('products.published') : t('products.drafts')}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mb-2 truncate">{product.category || 'No category'}</p>
                <div className="flex justify-between items-center">
                  <p className="font-bold text-sm">
                    {product.price ? `₹${Number(product.price).toLocaleString()}` : <span className="text-stone-400 font-normal">{t('products.no_price_set')}</span>}
                  </p>
                </div>
                
                {/* Readiness Score Bar & Quick Actions */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${product.readiness_score >= 100 ? 'bg-green-500' : product.readiness_score > 50 ? 'bg-amber-400' : 'bg-red-400'}`} 
                        style={{ width: `${Math.min(product.readiness_score || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-stone-400">{product.readiness_score || 0}%</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/artisan/products/${product.id}`); }}
                      className="text-[11px] font-bold text-primary hover:underline px-1 py-0.5 rounded"
                    >
                      View
                    </button>
                    <span className="text-stone-300">|</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/artisan/products/${product.id}/edit`); }}
                      className="text-[11px] font-bold text-stone-600 hover:underline px-1 py-0.5 rounded"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions Overlay */}
              <div className="absolute top-0 right-0 h-full bg-white/95 p-2 flex flex-col justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-full group-hover:translate-x-0 backdrop-blur-sm border-l border-stone-100 z-10">
                <button 
                  title="View Product Details"
                  onClick={(e) => { e.stopPropagation(); navigate(`/artisan/products/${product.id}`); }}
                  className="p-2 bg-stone-100 rounded-full text-brand-dark hover:bg-stone-200 transition-colors"
                >
                  <Eye size={16} />
                </button>
                <button 
                  title="Edit Product"
                  onClick={(e) => { e.stopPropagation(); navigate(`/artisan/products/${product.id}/edit`); }}
                  className="p-2 bg-stone-100 rounded-full text-brand-dark hover:bg-stone-200 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  title="Duplicate Product"
                  onClick={(e) => { e.stopPropagation(); handleDuplicate(product.id); }}
                  className="p-2 bg-stone-100 rounded-full text-secondary hover:bg-stone-200 transition-colors"
                >
                  <Copy size={16} />
                </button>
                <button 
                  title="Delete Product"
                  onClick={(e) => { e.stopPropagation(); setDeleteId(product.id); }}
                  className="p-2 bg-red-50 rounded-full text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={() => navigate('/artisan/products/new')}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </button>

      <BottomNav />

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold mb-2">{t('products.delete_product')}</h2>
            <p className="text-stone-600 mb-8">{t('products.are_you_sure_delete')}</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteId(null)}
                className="flex-1 py-4 font-bold text-stone-600 bg-stone-100 rounded-2xl"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={() => handleDelete()}
                className="flex-1 py-4 font-bold text-white bg-error rounded-2xl"
              >
                {t('products.delete_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
