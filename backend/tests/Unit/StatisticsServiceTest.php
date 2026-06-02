<?php

namespace Tests\Unit;

use App\Services\StatisticsService;
use ReflectionClass;

test('evaluateCount applies subtraction correctly', function () {
    $service = new StatisticsService;
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('evaluateCount');
    $method->setAccessible(true);

    // Test: 12 - 1 = 11
    $count = [
        'conditions' => [
            [
                'type' => 'value',
                'settings' => ['value' => 12],
                'operator' => '+',
            ],
            [
                'type' => 'value',
                'settings' => ['value' => 1],
                'operator' => '-',
            ],
        ],
    ];

    $totalRowsProcessed = 0;
    $result = $method->invokeArgs($service, [$count, 'roster', 1, &$totalRowsProcessed]);

    expect($result)->toBe(11.0);
});

test('evaluateCount handles brackets and operators correctly', function () {
    $service = new StatisticsService;
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('evaluateCount');
    $method->setAccessible(true);

    // Test: 12 - (1 + 2) = 9
    $count = [
        'conditions' => [
            [
                'type' => 'value',
                'settings' => ['value' => 12],
                'operator' => '+',
            ],
            [
                'type' => 'value',
                'brackets_open' => 1,
                'settings' => ['value' => 1],
                'operator' => '-',
            ],
            [
                'type' => 'value',
                'brackets_close' => 1,
                'settings' => ['value' => 2],
                'operator' => '+',
            ],
        ],
    ];

    $totalRowsProcessed = 0;
    $result = $method->invokeArgs($service, [$count, 'roster', 1, &$totalRowsProcessed]);

    expect($result)->toBe(9.0);
});

test('evaluateCount handles multiple operations correctly', function () {
    $service = new StatisticsService;
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('evaluateCount');
    $method->setAccessible(true);

    // Test: 10 * 2 + 5 = 25
    $count = [
        'conditions' => [
            [
                'type' => 'value',
                'settings' => ['value' => 10],
            ],
            [
                'type' => 'value',
                'settings' => ['value' => 2],
                'operator' => '*',
            ],
            [
                'type' => 'value',
                'settings' => ['value' => 5],
                'operator' => '+',
            ],
        ],
    ];

    $totalRowsProcessed = 0;
    $result = $method->invokeArgs($service, [$count, 'roster', 1, &$totalRowsProcessed]);

    expect($result)->toBe(25.0);
});

test('matchCondition handles in_roster condition correctly', function () {
    $service = new StatisticsService;

    // Set up roster pool cache using reflection
    $reflection = new ReflectionClass($service);
    $cacheProp = $reflection->getProperty('rosterPoolsCache');
    $cacheProp->setAccessible(true);

    // Roster content items
    $row1 = (object) ['content' => ['col_join' => 'john_doe', 'col_status' => 'Active']];
    $row2 = (object) ['content' => ['col_join' => 'jane_smith', 'col_status' => 'On Leave']];

    $cacheProp->setValue($service, [
        123 => collect([$row1, $row2]),
    ]);

    $method = $reflection->getMethod('matchCondition');
    $method->setAccessible(true);

    // Case 1: Match exists in roster
    $cond1 = [
        'target_col' => 'db_user',
        'match_type' => 'in_roster',
        'relation_roster_id' => 123,
        'relation_roster_col' => 'col_join',
    ];
    $data1 = ['db_user' => 'john_doe'];
    $result1 = $method->invoke($service, $data1, $cond1);
    expect($result1)->toBeTrue();

    // Case 2: Match does not exist in roster
    $data2 = ['db_user' => 'someone_else'];
    $result2 = $method->invoke($service, $data2, $cond1);
    expect($result2)->toBeFalse();

    // Case 3: Match exists but does not meet extra roster column criteria
    $cond2 = [
        'target_col' => 'db_user',
        'match_type' => 'in_roster',
        'relation_roster_id' => 123,
        'relation_roster_col' => 'col_join',
        'relation_column' => 'col_status',
        'relation_match_type' => 'equals',
        'relation_value' => 'Active',
    ];
    // john_doe is Active
    $result3 = $method->invoke($service, ['db_user' => 'john_doe'], $cond2);
    expect($result3)->toBeTrue();

    // jane_smith is On Leave, so relation_value => Active should fail
    $result4 = $method->invoke($service, ['db_user' => 'jane_smith'], $cond2);
    expect($result4)->toBeFalse();
});
