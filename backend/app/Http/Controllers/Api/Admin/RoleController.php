<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        if (! $request->user()->isSystemAdmin()) {
            return response()->json(['message' => 'Cette ressource est réservée à l\'administrateur système.'], 403);
        }

        return RoleResource::collection(Role::with('permissions')->get());
    }
}
