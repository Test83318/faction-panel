<?php

namespace App\Http\Controllers;

use App\Models\HelpArticle;
use App\Models\HelpCategory;
use Illuminate\Http\Request;

class HelpAdminController extends Controller
{
    private function checkSuperadmin(Request $request)
    {
        if (! $request->user() || ! $request->user()->is_superadmin) {
            abort(403, 'Unauthorized access.');
        }
    }

    public function getCategories(Request $request)
    {
        $this->checkSuperadmin($request);

        return HelpCategory::withCount('articles')->orderBy('order')->get();
    }

    public function storeCategory(Request $request)
    {
        $this->checkSuperadmin($request);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:255',
            'order' => 'integer',
        ]);

        return HelpCategory::create($validated);
    }

    public function updateCategory(Request $request, HelpCategory $category)
    {
        $this->checkSuperadmin($request);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:255',
            'order' => 'integer',
        ]);

        $category->update($validated);

        return $category;
    }

    public function deleteCategory(Request $request, HelpCategory $category)
    {
        $this->checkSuperadmin($request);
        $category->delete();

        return response()->json(['message' => 'Category deleted']);
    }

    public function getArticles(Request $request)
    {
        $this->checkSuperadmin($request);

        return HelpArticle::with('category')->orderBy('order')->get();
    }

    public function storeArticle(Request $request)
    {
        $this->checkSuperadmin($request);
        $validated = $request->validate([
            'category_id' => 'required|exists:help_categories,id',
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:help_articles,slug',
            'content' => 'required|string',
            'order' => 'integer',
            'is_published' => 'boolean',
        ]);

        $validated['created_by'] = $request->user()->id;

        return HelpArticle::create($validated);
    }

    public function updateArticle(Request $request, HelpArticle $article)
    {
        $this->checkSuperadmin($request);
        $validated = $request->validate([
            'category_id' => 'required|exists:help_categories,id',
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:help_articles,slug,'.$article->id,
            'content' => 'required|string',
            'order' => 'integer',
            'is_published' => 'boolean',
        ]);

        $article->update($validated);

        return $article;
    }

    public function deleteArticle(Request $request, HelpArticle $article)
    {
        $this->checkSuperadmin($request);
        $article->delete();

        return response()->json(['message' => 'Article deleted']);
    }
}
