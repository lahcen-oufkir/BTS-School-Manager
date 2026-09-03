<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function index(): JsonResponse
    {
        $dbOk = false;
        try {
            DB::select('SELECT 1');
            $dbOk = true;
        } catch (\Throwable) {
            // Database unavailable
        }

        $cacheOk = false;
        try {
            Cache::put('health_check', 'ok', 10);
            $cacheOk = Cache::get('health_check') === 'ok';
        } catch (\Throwable) {
            // Cache unavailable
        }

        return response()->json([
            'status' => $dbOk && $cacheOk ? 'ok' : 'degraded',
            'database' => $dbOk ? 'ok' : 'error',
            'cache' => $cacheOk ? 'ok' : 'error',
            'app' => config('app.name'),
            'version' => '1.0.0',
            'time' => now()->toIso8601String(),
        ]);
    }
}
