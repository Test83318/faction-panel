import React, { useState, useEffect } from 'react';
import { HelpCategory, HelpArticle } from '../types';
import api from '../api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, BookOpen, Layers, GripVertical, Save, X, Eye, EyeOff } from 'lucide-react';
import Loading from './Loading';

const HelpAdmin: React.FC = () => {
    const [categories, setCategories] = useState<HelpCategory[]>([]);
    const [articles, setArticles] = useState<HelpArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'articles' | 'categories'>('articles');

    const [showCategoryModal, setShowCategoryModal] = useState<HelpCategory | 'create' | null>(null);
    const [showArticleModal, setShowArticleModal] = useState<HelpArticle | 'create' | null>(null);

    const [catForm, setCatForm] = useState({ name: '', icon: '', order: 0 });
    const [artForm, setArtForm] = useState({ category_id: 0, title: '', slug: '', content: '', order: 0, is_published: true });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catRes, artRes] = await Promise.all([
                api.get('/help/admin/categories'),
                api.get('/help/admin/articles')
            ]);
            setCategories(catRes.data);
            setArticles(artRes.data);
            if (catRes.data.length > 0) setArtForm(prev => ({ ...prev, category_id: catRes.data[0].id }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const loadToast = toast.loading('Saving category...');
        try {
            if (showCategoryModal === 'create') {
                await api.post('/help/admin/categories', catForm);
            } else {
                await api.put(`/help/admin/categories/${(showCategoryModal as HelpCategory).id}`, catForm);
            }
            toast.success('Category saved', { id: loadToast });
            setShowCategoryModal(null);
            fetchData();
        } catch (err) {
            toast.error('Failed to save category', { id: loadToast });
        }
    };

    const handleArticleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const loadToast = toast.loading('Saving article...');
        try {
            if (showArticleModal === 'create') {
                await api.post('/help/admin/articles', artForm);
            } else {
                await api.put(`/help/admin/articles/${(showArticleModal as HelpArticle).id}`, artForm);
            }
            toast.success('Article saved', { id: loadToast });
            setShowArticleModal(null);
            fetchData();
        } catch (err) {
            toast.error('Failed to save article', { id: loadToast });
        }
    };

    const deleteCategory = async (id: number) => {
        if (!confirm('Are you sure? This will delete all articles in this category.')) return;
        try {
            await api.delete(`/help/admin/categories/${id}`);
            toast.success('Category deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete category');
        }
    };

    const deleteArticle = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/help/admin/articles/${id}`);
            toast.success('Article deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete article');
        }
    };

    if (loading) return <Loading message="Loading Help Management..." />;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Help Center Management</h2>
                    <p className="text-muted font-bold uppercase tracking-widest text-[10px] mt-1">Manage categories and articles for the help center</p>
                </div>
                <div className="flex bg-surface rounded-xl p-1 border border-border">
                    <button 
                        onClick={() => setActiveTab('articles')}
                        className={`px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'articles' ? 'bg-accent text-white' : 'text-muted hover:text-text'}`}
                    >
                        Articles
                    </button>
                    <button 
                        onClick={() => setActiveTab('categories')}
                        className={`px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'categories' ? 'bg-accent text-white' : 'text-muted hover:text-text'}`}
                    >
                        Categories
                    </button>
                </div>
            </div>

            {activeTab === 'articles' ? (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button 
                            onClick={() => {
                                setArtForm({ category_id: categories[0]?.id || 0, title: '', slug: '', content: '', order: 0, is_published: true });
                                setShowArticleModal('create');
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-accent/20 hover:scale-105 transition-all"
                        >
                            <Plus size={14} /> Add Article
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {articles.map(article => (
                            <div key={article.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between group hover:border-accent/30 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-muted group-hover:text-accent transition-colors">
                                        <BookOpen size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-black uppercase tracking-tight text-lg leading-tight">{article.title}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1">
                                                <Layers size={10} /> {article.category?.name}
                                            </span>
                                            {!article.is_published && (
                                                <span className="text-[9px] font-black uppercase tracking-widest bg-danger/10 text-danger px-1.5 py-0.5 rounded">Draft</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => {
                                            setArtForm({ 
                                                category_id: article.category_id, 
                                                title: article.title, 
                                                slug: article.slug, 
                                                content: article.content, 
                                                order: article.order, 
                                                is_published: article.is_published 
                                            });
                                            setShowArticleModal(article);
                                        }}
                                        className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button 
                                        onClick={() => deleteArticle(article.id)}
                                        className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button 
                            onClick={() => {
                                setCatForm({ name: '', icon: '', order: 0 });
                                setShowCategoryModal('create');
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-accent/20 hover:scale-105 transition-all"
                        >
                            <Plus size={14} /> Add Category
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map(category => (
                            <div key={category.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col group hover:border-accent/30 transition-all">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-accent">
                                        <Layers size={24} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => {
                                                setCatForm({ name: category.name, icon: category.icon || '', order: category.order });
                                                setShowCategoryModal(category);
                                            }}
                                            className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button 
                                            onClick={() => deleteCategory(category.id)}
                                            className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <h4 className="font-black uppercase tracking-tighter text-xl mb-1">{category.name}</h4>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{category.articles_count} Articles</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[900]">
                    <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">
                            {showCategoryModal === 'create' ? 'Add Category' : 'Edit Category'}
                        </h3>
                        <form onSubmit={handleCategorySubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Category Name</label>
                                <input 
                                    type="text" 
                                    value={catForm.name}
                                    onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                                    className="w-full bg-surface border border-border p-3 rounded-xl font-bold focus:border-accent outline-none"
                                    required
                                />
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowCategoryModal(null)}
                                    className="flex-1 p-3 bg-surface hover:bg-surface/50 border border-border rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 p-3 bg-accent text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-accent/20 transition-all"
                                >
                                    Save Category
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Article Modal */}
            {showArticleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[900]">
                    <div className="bg-card border border-border rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">
                            {showArticleModal === 'create' ? 'Add Article' : 'Edit Article'}
                        </h3>
                        <form onSubmit={handleArticleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Category</label>
                                    <select 
                                        value={artForm.category_id}
                                        onChange={e => setArtForm({ ...artForm, category_id: Number(e.target.value) })}
                                        className="w-full bg-surface border border-border p-3 rounded-xl font-bold focus:border-accent outline-none"
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Article Title</label>
                                    <input 
                                        type="text" 
                                        value={artForm.title}
                                        onChange={e => setArtForm({ ...artForm, title: e.target.value })}
                                        className="w-full bg-surface border border-border p-3 rounded-xl font-bold focus:border-accent outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Content</label>
                                <textarea 
                                    value={artForm.content}
                                    onChange={e => setArtForm({ ...artForm, content: e.target.value })}
                                    className="w-full bg-surface border border-border p-3 rounded-xl font-bold focus:border-accent outline-none min-h-[300px]"
                                    required
                                    placeholder="Write your article content here..."
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${artForm.is_published ? 'bg-accent/20 text-accent' : 'bg-muted/10 text-muted'}`}>
                                        {artForm.is_published ? <Eye size={20} /> : <EyeOff size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-black uppercase tracking-tight">Publication Status</p>
                                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                                            {artForm.is_published ? 'This article is visible to everyone' : 'This article is a draft'}
                                        </p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={artForm.is_published}
                                        onChange={e => setArtForm({ ...artForm, is_published: e.target.checked })}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                </label>
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowArticleModal(null)}
                                    className="flex-1 p-4 bg-surface hover:bg-surface/50 border border-border rounded-xl font-black uppercase tracking-widest text-xs transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 p-4 bg-accent text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-accent/20 transition-all"
                                >
                                    Save Article
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HelpAdmin;
