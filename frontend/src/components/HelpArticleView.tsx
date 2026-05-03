import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Clock, ChevronRight } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import Loading from './Loading';
import { HelpArticle } from '../types';
import { Header } from './Header';

const HelpArticleView: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [article, setArticle] = useState<HelpArticle | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArticle = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/help/articles/${slug}`);
                setArticle(res.data);
            } catch (err) {
                console.error('Failed to fetch article', err);
                toast.error('Article not found');
                navigate('/help');
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
    }, [slug, navigate]);

    if (loading) return <Loading message="Loading Article..." />;
    if (!article) return null;

    return (
        <div className="max-w-4xl mx-auto py-10 px-6">
            <Link 
                to="/help"
                className="inline-flex items-center gap-2 text-muted hover:text-text font-bold uppercase tracking-widest text-[10px] mb-8 transition-colors"
            >
                <ArrowLeft size={14} />
                Back to Help Center
            </Link>

            <article className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-8 md:p-12 border-b border-border bg-surface/30">
                    <div className="flex items-center gap-2 text-accent font-black uppercase tracking-widest text-[10px] mb-4">
                        <span>Help Center</span>
                        <ChevronRight size={10} />
                        <span>{article.category?.name}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-8">{article.title}</h1>
                    
                    <div className="flex flex-wrap gap-6 text-[10px] font-bold text-muted uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-accent" />
                            Updated {new Date(article.updated_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={12} className="text-accent" />
                            {Math.ceil(article.content.split(' ').length / 200)} min read
                        </div>
                    </div>
                </div>

                <div className="p-8 md:p-12 prose prose-invert max-w-none">
                    <div 
                        className="help-content space-y-6 text-lg text-text/80 leading-relaxed font-medium"
                        dangerouslySetInnerHTML={{ __html: formatContent(article.content) }}
                    />
                </div>
            </article>

            <div className="mt-12 bg-accent/5 border border-accent/10 rounded-3xl p-8 text-center">
                <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Still need help?</h3>
                <p className="text-muted font-bold text-xs uppercase tracking-widest mb-6">If you couldn't find what you were looking for, please contact a system administrator.</p>
            </div>
        </div>
    );
};

const formatContent = (content: string) => {
    // Simple formatter for demo, in real app would use a proper markdown parser or rich text
    return content
        .replace(/\n\n/g, '</div><div class="mb-6">')
        .replace(/\n/g, '<br />');
};

export default HelpArticleView;
