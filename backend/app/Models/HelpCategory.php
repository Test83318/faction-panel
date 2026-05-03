<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HelpCategory extends Model
{
    protected $fillable = ['name', 'icon', 'order'];

    public function articles()
    {
        return $this->hasMany(HelpArticle::class, 'category_id')->orderBy('order');
    }
}
