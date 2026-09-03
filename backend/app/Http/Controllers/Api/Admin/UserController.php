<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query()
            ->with('school')
            ->when($request->boolean('is_active'), fn ($q) => $q->where('is_active', true))
            ->when($request->filled('role'), fn ($q) => $q->where('role', $request->input('role')))
            ->when($request->filled('school_id'), fn ($q) => $q->where('school_id', $request->input('school_id')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->input('search');
                $q->where(fn ($sub) => $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"));
            });

        if ($request->user()->isEstablishmentAdmin()) {
            $query->where('school_id', $request->user()->school_id);
        }

        return UserResource::collection($query->orderBy('name')->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreUserRequest $request)
    {
        $data = $request->validated();

        if ($request->user()->isEstablishmentAdmin()) {
            $data['school_id'] = $request->user()->school_id;
        }

        $user = User::create($data);

        return (new UserResource($user->load('school')))->response()->setStatusCode(201);
    }

    public function show(Request $request, User $user)
    {
        if ($request->user()->isEstablishmentAdmin() && $user->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        return new UserResource($user->load('school'));
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        if ($request->user()->isEstablishmentAdmin() && $user->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $request->validated();

        if ($request->user()->isEstablishmentAdmin()) {
            $data['school_id'] = $request->user()->school_id;
        }

        if ($request->filled('password')) {
            $user->update($data);
        } else {
            unset($data['password']);
            $user->update($data);
        }

        return new UserResource($user->fresh()->load('school'));
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }

        if ($request->user()->isEstablishmentAdmin() && $user->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }
}
