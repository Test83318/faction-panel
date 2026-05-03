import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, HelpCircle } from 'lucide-react';
import api from '../api';
import Loading from './Loading';
import { HelpCategory, HelpArticle } from '../types';
import { Header } from './Header';

const HelpCategoryView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [category, setCategory] = useState<HelpCategory | null>(null);
    const [articles, setArticles] = useState<HelpArticle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategoryData = async () => {
            try {
                // We don't have a single category endpoint, so we fetch all and find this one
                // or just fetch its articles. Let's fetch articles and assume first one has category info
                const [artRes, catRes] = await Promise.all([
                    api.get(`/help/categories/${id}/articles`),
                    api.get('/help/categories')
                ]);
                
                const currentCat = catRes.data.find((c: any) => c.id === Number(id));
                setCategory(currentCat);
                setArticles(artRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCategoryData();
    }, [id]);

    if (loading) return <Loading message="Loading Category..." />;
    if (!category) return null;

    return (
        <div className="max-w-5xl mx-auto py-10 px-6">
            <Link 
                to="/help"
                className="inline-flex items-center gap-2 text-muted hover:text-text font-bold uppercase tracking-widest text-[10px] mb-8 transition-colors"
            >
                <ArrowLeft size={14} />
                Back to Help Center
            </Link>

            <div className="flex items-center gap-6 mb-12">
                <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center text-accent">
                    <HelpCircle size={40} />
                </div>
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">{category.name}</h1>
                    <p className="text-muted font-bold uppercase tracking-widest text-xs">{articles.length} Articles in this category</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {articles.map(article => (
                    <Link 
                        key={article.id}
                        to={`/help/article/${article.slug}`}
                        className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between group hover:border-accent/50 transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-muted group-hover:text-accent transition-colors">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight leading-tight">{article.title}</h3>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                                    Last updated {new Date(article.updated_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <ChevronRight size={24} className="text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </Link>
                ))}

                {articles.length === 0 && (
                    <div className="text-center py-20 bg-surface/30 border-2 border-dashed border-border rounded-3xl">
                        <p className="text-muted font-black uppercase tracking-[0.2em]">No articles in this category yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HelpCategoryView;
