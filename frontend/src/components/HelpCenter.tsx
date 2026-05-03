import React, { useState, useEffect } from 'react';
import { Search, BookOpen, ChevronRight, HelpCircle, ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import Loading from './Loading';
import { HelpCategory, HelpArticle } from '../types';
import { Header } from './Header';

const HelpCenter: React.FC = () => {
    const [categories, setCategories] = useState<HelpCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/help/categories');
            setCategories(res.data);
        } catch (err) {
            console.error('Failed to fetch help categories', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await api.get(`/help/articles/search?q=${encodeURIComponent(query)}`);
            setSearchResults(res.data);
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setIsSearching(false);
        }
    };

    if (loading) return <Loading message="Loading Help Center..." />;

    return (
        <div className="max-w-5xl mx-auto py-10 px-6">
            <div className="text-center mb-12">
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Help Center</h1>
                    <p className="text-muted font-medium uppercase tracking-widest text-xs">Search for articles or browse categories below</p>
                    
                    <div className="mt-8 max-w-2xl mx-auto relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search size={18} className="text-muted" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search for articles, guides, or FAQs..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full bg-card border border-border pl-12 pr-4 py-4 rounded-2xl shadow-xl focus:border-accent outline-none transition-all text-lg font-bold"
                        />
                        
                        {searchQuery.length >= 2 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden text-left">
                                {isSearching ? (
                                    <div className="p-4 text-center text-xs font-bold uppercase tracking-widest text-muted">Searching...</div>
                                ) : searchResults.length > 0 ? (
                                    <div className="divide-y divide-border">
                                        {searchResults.map(article => (
                                            <Link 
                                                key={article.id}
                                                to={`/help/article/${article.slug}`}
                                                className="block p-4 hover:bg-surface transition-colors"
                                            >
                                                <div className="font-bold text-text mb-1">{article.title}</div>
                                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest flex items-center gap-2">
                                                    <BookOpen size={10} />
                                                    {article.category?.name}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-xs font-bold uppercase tracking-widest text-muted">No results found for "{searchQuery}"</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map(category => (
                        <div key={category.id} className="bg-card border border-border rounded-2xl p-6 hover:border-accent/50 transition-all group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                                    <HelpCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tighter leading-tight">{category.name}</h3>
                                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{category.articles_count} Articles</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <CategoryArticles categoryId={category.id} />
                            </div>
                        </div>
                    ))}
                </div>
                
                {categories.length === 0 && (
                    <div className="text-center py-20 bg-surface/30 border-2 border-dashed border-border rounded-3xl">
                        <HelpCircle size={48} className="mx-auto text-muted opacity-20 mb-4" />
                        <p className="text-muted font-black uppercase tracking-[0.2em]">No help content available yet</p>
                    </div>
                )}
            </div>
    );
};

const CategoryArticles: React.FC<{ categoryId: number }> = ({ categoryId }) => {
    const [articles, setArticles] = useState<HelpArticle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get(`/help/categories/${categoryId}/articles`);
                setArticles(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [categoryId]);

    if (loading) return <div className="animate-pulse space-y-2"><div className="h-4 bg-surface rounded w-3/4"></div><div className="h-4 bg-surface rounded w-1/2"></div></div>;

    return (
        <>
            {articles.slice(0, 5).map(article => (
                <Link 
                    key={article.id}
                    to={`/help/article/${article.slug}`}
                    className="flex items-center justify-between group/item p-2 -mx-2 rounded-lg hover:bg-surface transition-all"
                >
                    <span className="text-sm font-bold text-text/80 group-hover/item:text-text">{article.title}</span>
                    <ChevronRight size={14} className="text-muted opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all" />
                </Link>
            ))}
            {articles.length > 5 && (
                <Link 
                    to={`/help/category/${categoryId}`}
                    className="inline-block text-[10px] font-black uppercase tracking-widest text-accent hover:underline mt-2"
                >
                    View all {articles.length} articles
                </Link>
            )}
        </>
    );
};

export default HelpCenter;
