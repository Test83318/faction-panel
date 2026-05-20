<?php

namespace Tests\Unit;

use App\Services\StatisticsService;
use ReflectionClass;

test('evaluateCount applies subtraction correctly', function () {
    $service = new StatisticsService();
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('evaluateCount');
    $method->setAccessible(true);

    // Test: 12 - 1 = 11
    $count = [
        'conditions' => [
            [
                'type' => 'value',
                'settings' => ['value' => 12],
                'operator' => '+'
            ],
            [
                'type' => 'value',
                'settings' => ['value' => 1],
                'operator' => '-'
            ]
        ]
    ];

    $totalRowsProcessed = 0;
    $result = $method->invokeArgs($service, [$count, 'roster', 1, &$totalRowsProcessed]);

    expect($result)->toBe(11.0);
});

test('evaluateCount handles brackets and operators correctly', function () {
    $service = new StatisticsService();
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('evaluateCount');
    $method->setAccessible(true);

    // Test: 12 - (1 + 2) = 9
    $count = [
        'conditions' => [
            [
                'type' => 'value',
                'settings' => ['value' => 12],
                'operator' => '+'
            ],
            [
                'type' => 'value',
                'brackets_open' => 1,
                'settings' => ['value' => 1],
                'operator' => '-'
            ],
            [
                'type' => 'value',
                'brackets_close' => 1,
                'settings' => ['value' => 2],
                'operator' => '+'
            ]
        ]
    ];

    $totalRowsProcessed = 0;
    $result = $method->invokeArgs($service, [$count, 'roster', 1, &$totalRowsProcessed]);

    expect($result)->toBe(9.0);
});

test('evaluateCount handles multiple operations correctly', function () {
    $service = new StatisticsService();
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('evaluateCount');
    $method->setAccessible(true);

    // Test: 10 * 2 + 5 = 25
    $count = [
        'conditions' => [
            [
                'type' => 'value',
                'settings' => ['value' => 10]
            ],
            [
                'type' => 'value',
                'settings' => ['value' => 2],
                'operator' => '*'
            ],
            [
                'type' => 'value',
                'settings' => ['value' => 5],
                'operator' => '+'
            ]
        ]
    ];

    $totalRowsProcessed = 0;
    $result = $method->invokeArgs($service, [$count, 'roster', 1, &$totalRowsProcessed]);

    expect($result)->toBe(25.0);
});
