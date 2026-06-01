<?php

namespace App\Http\Controllers;

use App\Models\HelpArticle;
use App\Models\HelpCategory;
use Illuminate\Http\Request;

class HelpController extends Controller
{
    public function getCategories()
    {
        $this->audit('help.category.list', 'Viewed help categories');

        return HelpCategory::withCount(['articles' => function ($query) {
            $query->where('is_published', true);
        }])->orderBy('order')->get();
    }

    public function getCategoryArticles(HelpCategory $category)
    {
        $this->audit('help.category.articles', "Viewed articles for help category '{$category->name}'", null, $category);

        return $category->articles()->where('is_published', true)->orderBy('order')->get();
    }

    public function getArticle($slug)
    {
        $article = HelpArticle::where('slug', $slug)
            ->where('is_published', true)
            ->with('category')
            ->firstOrFail();

        $this->audit('help.article.view', "Viewed help article '{$article->title}'", null, $article);

        return $article;
    }

    public function search(Request $request)
    {
        $query = $request->input('q');

        if (! $query) {
            $this->audit('help.search', 'Searched help articles with empty query');

            return response()->json([]);
        }

        $this->audit('help.search', "Searched help articles for '{$query}'");

        return HelpArticle::where('is_published', true)
            ->where(function ($q) use ($query) {
                $q->where('title', 'like', "%{$query}%")
                    ->orWhere('content', 'like', "%{$query}%");
            })
            ->with('category')
            ->limit(10)
            ->get();
    }
}
