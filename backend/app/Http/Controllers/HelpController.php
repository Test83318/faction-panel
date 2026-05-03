<?php

namespace App\Http\Controllers;

use App\Models\HelpCategory;
use App\Models\HelpArticle;
use Illuminate\Http\Request;

class HelpController extends Controller
{
    public function getCategories()
    {
        return HelpCategory::withCount(['articles' => function ($query) {
            $query->where('is_published', true);
        }])->orderBy('order')->get();
    }

    public function getCategoryArticles(HelpCategory $category)
    {
        return $category->articles()->where('is_published', true)->orderBy('order')->get();
    }

    public function getArticle($slug)
    {
        $article = HelpArticle::where('slug', $slug)
            ->where('is_published', true)
            ->with('category')
            ->firstOrFail();
            
        return $article;
    }

    public function search(Request $request)
    {
        $query = $request->input('q');
        
        if (!$query) {
            return response()->json([]);
        }

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
