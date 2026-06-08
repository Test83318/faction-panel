<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('changelog_entries', function (Blueprint $table) {
            $table->json('items')->nullable()->after('body');
            $table->text('body')->nullable()->change();
        });

        // Migrate existing entries
        $entries = DB::table('changelog_entries')->get();
        foreach ($entries as $entry) {
            if ($entry->body && ! $entry->items) {
                $items = [];
                $lines = explode("\n", $entry->body);
                foreach ($lines as $line) {
                    $line = trim($line);
                    // Match bullet points starting with - or *
                    if (preg_match('/^[\-\*]\s+(.+)$/', $line, $matches)) {
                        // Check if it's a modification, fix, backend, or feature based on keyword
                        $content = trim($matches[1]);
                        $type = 'Feature';

                        $lowerContent = strtolower($content);
                        if (str_contains($lowerContent, 'fix') || str_contains($lowerContent, 'bug') || str_contains($lowerContent, 'resolve')) {
                            $type = 'Fix';
                        } elseif (str_contains($lowerContent, 'optim') || str_contains($lowerContent, 'refactor') || str_contains($lowerContent, 'performance') || str_contains($lowerContent, 'adjust') || str_contains($lowerContent, 'improve')) {
                            $type = 'Modification';
                        } elseif (str_contains($lowerContent, 'backend') || str_contains($lowerContent, 'database') || str_contains($lowerContent, 'migration') || str_contains($lowerContent, 'api')) {
                            $type = 'Backend';
                        }

                        $items[] = [
                            'type' => $type,
                            'content' => $content,
                        ];
                    }
                }

                if (! empty($items)) {
                    DB::table('changelog_entries')
                        ->where('id', $entry->id)
                        ->update(['items' => json_encode($items)]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('changelog_entries', function (Blueprint $table) {
            // Restore body to be not nullable (if possible, but might fail if body is null, so keep nullable or clean up)
            $table->text('body')->nullable(false)->change();
            $table->dropColumn('items');
        });
    }
};
