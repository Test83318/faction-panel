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

        $this->audit('help.admin.category.list', 'Viewed help categories for administration');

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

        $category = HelpCategory::create($validated);

        $this->audit('help.admin.category.create', "Created help category '{$category->name}'", null, $category, null, $category->getAttributes());

        return $category;
    }

    public function updateCategory(Request $request, HelpCategory $category)
    {
        $this->checkSuperadmin($request);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:255',
            'order' => 'integer',
        ]);

        $oldValues = $category->getOriginal();
        $category->update($validated);

        $this->audit('help.admin.category.update', "Updated help category '{$category->name}'", null, $category, $oldValues, $category->getDirty());

        return $category;
    }

    public function deleteCategory(Request $request, HelpCategory $category)
    {
        $this->checkSuperadmin($request);

        $this->audit('help.admin.category.delete', "Deleted help category '{$category->name}'", null, $category, $category->getAttributes());

        $category->delete();

        return response()->json(['message' => 'Category deleted']);
    }

    public function getArticles(Request $request)
    {
        $this->checkSuperadmin($request);

        $this->audit('help.admin.article.list', 'Viewed help articles for administration');

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

        $article = HelpArticle::create($validated);

        $this->audit('help.admin.article.create', "Created help article '{$article->title}'", null, $article, null, $article->getAttributes());

        return $article;
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

        $oldValues = $article->getOriginal();
        $article->update($validated);

        $this->audit('help.admin.article.update', "Updated help article '{$article->title}'", null, $article, $oldValues, $article->getDirty());

        return $article;
    }

    public function deleteArticle(Request $request, HelpArticle $article)
    {
        $this->checkSuperadmin($request);

        $this->audit('help.admin.article.delete', "Deleted help article '{$article->title}'", null, $article, $article->getAttributes());

        $article->delete();

        return response()->json(['message' => 'Article deleted']);
    }
}
