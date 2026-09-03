<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRoomRequest;
use App\Http\Requests\Admin\UpdateRoomRequest;
use App\Http\Resources\RoomResource;
use App\Models\Room;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index(Request $request)
    {
        $query = Room::query()
            ->with('school')
            ->withCount('schedules')
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->input('search');
                $q->where(fn ($sub) => $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('type', 'like', "%{$search}%"));
            })
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->input('type')))
            ->when($request->filled('school_id'), fn ($q) => $q->where('school_id', $request->input('school_id')))
            ->orderBy('name');

        if ($request->user()->isEstablishmentAdmin()) {
            $query->where('school_id', $request->user()->school_id);
        }

        return RoomResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreRoomRequest $request)
    {
        $data = $request->validated();

        if ($request->user()->isEstablishmentAdmin()) {
            $data['school_id'] = $request->user()->school_id;
        }

        $room = Room::create($data);

        return (new RoomResource(
            $room->load('school')->loadCount('schedules')
        ))->response()->setStatusCode(201);
    }

    public function show(Request $request, Room $room)
    {
        if ($this->cannotAccessRoom($request, $room)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $room->load('school')->loadCount('schedules');

        return new RoomResource($room);
    }

    public function update(UpdateRoomRequest $request, Room $room)
    {
        if ($this->cannotAccessRoom($request, $room)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $request->validated();

        if ($request->user()->isEstablishmentAdmin()) {
            unset($data['school_id']);
        }

        $room->update($data);

        return new RoomResource(
            $room->fresh()->load('school')->loadCount('schedules')
        );
    }

    public function destroy(Request $request, Room $room)
    {
        if ($this->cannotAccessRoom($request, $room)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $room->delete();

        return response()->json(['message' => 'Salle supprimée.']);
    }

    private function cannotAccessRoom(Request $request, Room $room): bool
    {
        return $request->user()->isEstablishmentAdmin() && $room->school_id !== $request->user()->school_id;
    }
}
