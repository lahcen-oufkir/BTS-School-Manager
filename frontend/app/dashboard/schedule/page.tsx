"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Modal } from "@/components/admin/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { fetchAcademicYears, fetchClasses, fetchSubjects, fetchTeachers } from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  createRoom,
  createSchedule,
  deleteRoom,
  deleteSchedule,
  fetchRooms,
  fetchSchedules,
  updateRoom,
  type RoomPayload,
  type SchedulePayload,
} from "@/lib/schedule-api";
import type {
  AcademicYear,
  DayOfWeek,
  Room,
  Schedule,
  SchoolClass,
  Subject,
  Teacher,
} from "@/lib/types";

const weekDays: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const emptyScheduleForm: SchedulePayload = {
  class_id: 0,
  subject_id: 0,
  teacher_id: null,
  room_id: null,
  academic_year_id: 0,
  day_of_week: "monday",
  start_time: "",
  end_time: "",
};

const emptyRoomForm: RoomPayload = {
  name: "",
  code: "",
  capacity: null,
  type: "",
};

export default function SchedulePage() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();

  const [view, setView] = useState<"grid" | "rooms">("grid");

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedClass, setSelectedClass] = useState(0);
  const [selectedYear, setSelectedYear] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<SchedulePayload>(emptyScheduleForm);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<RoomPayload>(emptyRoomForm);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

  const loadSchedules = useCallback(
    async (classId: number, yearId: number) => {
      const filters: Record<string, number> = { per_page: 100 };
      if (classId) filters.class_id = classId;
      if (yearId) filters.academic_year_id = yearId;
      try {
        const result = await fetchSchedules(filters);
        setSchedules(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadRooms = useCallback(async () => {
    try {
      const result = await fetchRooms({ per_page: 100 });
      setRooms(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }, []);

  const effectiveClassId = selectedClass || classes[0]?.id || 0;
  const effectiveYearId =
    selectedYear ||
    academicYears.find((year) => year.is_current)?.id ||
    academicYears[0]?.id ||
    0;

  useEffect(() => {
    fetchClasses({ per_page: 100 })
      .then((result) => setClasses(result.data))
      .catch(() => setClasses([]));
    fetchSubjects({ per_page: 100 })
      .then((result) => setSubjects(result.data))
      .catch(() => setSubjects([]));
    fetchTeachers({ per_page: 100, is_active: true })
      .then((result) => setTeachers(result.data))
      .catch(() => setTeachers([]));
    fetchAcademicYears({ per_page: 100 })
      .then((result) => setAcademicYears(result.data))
      .catch(() => setAcademicYears([]));
    fetchRooms({ per_page: 100 })
      .then((result) => setRooms(result.data))
      .catch(() => setRooms([]));
  }, []);

  useEffect(() => {
    if (effectiveClassId === 0) return;
    const filters: Record<string, number> = { per_page: 100 };
    if (effectiveClassId) filters.class_id = effectiveClassId;
    if (effectiveYearId) filters.academic_year_id = effectiveYearId;
    let ignore = false;
    fetchSchedules(filters)
      .then((result) => {
        if (ignore) return;
        setSchedules(result.data);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "Erreur");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [effectiveClassId, effectiveYearId]);

  const grouped = useMemo(() => {
    const map: Record<DayOfWeek, Schedule[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };
    for (const entry of schedules) {
      map[entry.day_of_week]?.push(entry);
    }
    for (const day of weekDays) {
      map[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [schedules]);

  const openCreateSchedule = () => {
    setScheduleForm({
      ...emptyScheduleForm,
      class_id: effectiveClassId,
      academic_year_id: effectiveYearId,
    });
    setScheduleModalOpen(true);
  };

  const submitSchedule = async () => {
    setSaving(true);
    setError("");
    try {
      await createSchedule({
        ...scheduleForm,
        subject_id: scheduleForm.subject_id,
        teacher_id: scheduleForm.teacher_id || null,
        room_id: scheduleForm.room_id || null,
        academic_year_id: scheduleForm.academic_year_id,
      });
      setScheduleModalOpen(false);
      await loadSchedules(scheduleForm.class_id, selectedYear);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteSchedule = async () => {
    if (!deletingSchedule) return;
    setSaving(true);
    try {
      await deleteSchedule(deletingSchedule.id);
      setDeletingSchedule(null);
      await loadSchedules(selectedClass, selectedYear);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const openCreateRoom = () => {
    setEditingRoom(null);
    setRoomForm(emptyRoomForm);
    setRoomModalOpen(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      name: room.name,
      code: room.code ?? "",
      capacity: room.capacity ?? null,
      type: room.type ?? "",
    });
    setRoomModalOpen(true);
  };

  const submitRoom = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...roomForm,
        code: roomForm.code || null,
        capacity: roomForm.capacity ? Number(roomForm.capacity) : null,
        type: roomForm.type || null,
      };
      if (editingRoom) {
        await updateRoom(editingRoom.id, payload);
      } else {
        await createRoom(payload);
      }
      setRoomModalOpen(false);
      await loadRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteRoom = async () => {
    if (!deletingRoom) return;
    setSaving(true);
    try {
      await deleteRoom(deletingRoom.id);
      setDeletingRoom(null);
      await loadRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("schedule.title")}</h1>
        <div className="flex gap-2">
          {hasPermission("rooms.view") && (
            <Button variant={view === "grid" ? "outline" : "secondary"} onClick={() => setView("grid")}>
              {t("schedule.grid")}
            </Button>
          )}
          {hasPermission("rooms.view") && (
            <Button variant={view === "rooms" ? "outline" : "secondary"} onClick={() => setView("rooms")}>
              {t("schedule.rooms")}
            </Button>
          )}
          {view === "grid" && hasPermission("schedule.create") && (
            <Button onClick={openCreateSchedule}>{t("schedule.create")}</Button>
          )}
          {view === "rooms" && hasPermission("rooms.create") && (
            <Button onClick={openCreateRoom}>{t("schedule.create_room")}</Button>
          )}
        </div>
      </div>

      {view === "grid" ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-64">
              <Select
                label={t("grades.class")}
                value={effectiveClassId}
                onChange={(event) => setSelectedClass(Number(event.target.value))}
              >
                <option value={0} disabled>
                  {t("common.select")}
                </option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-56">
              <Select
                label={t("grades.academic_year")}
                value={effectiveYearId}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                <option value={0}>{t("admin.all")}</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

          <Card>
            <CardContent className="overflow-x-auto p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {weekDays.map((day) => (
                        <th
                          key={day}
                          className="min-w-40 border-r border-slate-200 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 last:border-r-0"
                        >
                          {t(`schedule.day_${day}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {weekDays.map((day) => (
                        <td
                          key={day}
                          className="min-w-40 align-top border-r border-slate-200 p-2 last:border-r-0"
                        >
                          <div className="space-y-2">
                            {grouped[day].length === 0 && (
                              <p className="px-2 py-6 text-center text-xs text-slate-400">
                                {t("admin.empty")}
                              </p>
                            )}
                            {grouped[day].map((entry) => (
                              <div
                                key={entry.id}
                                className="group rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
                              >
                                <p className="text-sm font-medium text-slate-900">
                                  {entry.subject?.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {entry.start_time} – {entry.end_time}
                                </p>
                                <p className="mt-1 flex flex-wrap gap-1">
                                  {entry.teacher && (
                                    <Badge variant="default">
                                      {entry.teacher.first_name} {entry.teacher.last_name}
                                    </Badge>
                                  )}
                                  {entry.room && <Badge variant="info">{entry.room.name}</Badge>}
                                </p>
                                {hasPermission("schedule.update") && (
                                  <div className="mt-2 hidden group-hover:block">
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      className="w-full"
                                      onClick={() => setDeletingSchedule(entry)}
                                    >
                                      {t("common.delete")}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
            <CardContent className="p-0">
              {rooms.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-500">{t("admin.empty")}</p>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">{t("schedule.room")}</th>
                      <th className="px-5 py-3">{t("schedule.room_code")}</th>
                      <th className="px-5 py-3">{t("schedule.room_type")}</th>
                      <th className="px-5 py-3">{t("schedule.room_capacity")}</th>
                      <th className="px-5 py-3">{t("schedule.room_usage")}</th>
                      <th className="px-5 py-3 text-right">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">{room.name}</td>
                        <td className="px-5 py-3 text-slate-600">{room.code ?? "—"}</td>
                        <td className="px-5 py-3 text-slate-600">{room.type ?? "—"}</td>
                        <td className="px-5 py-3 text-slate-600">{room.capacity ?? "—"}</td>
                        <td className="px-5 py-3">
                          <Badge variant="info">{room.schedules_count ?? 0}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {hasPermission("rooms.update") && (
                              <Button variant="outline" size="sm" onClick={() => openEditRoom(room)}>
                                {t("common.edit")}
                              </Button>
                            )}
                            {hasPermission("rooms.delete") && (
                              <Button variant="danger" size="sm" onClick={() => setDeletingRoom(room)}>
                                {t("common.delete")}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        open={scheduleModalOpen}
        title={t("schedule.create")}
        onClose={() => setScheduleModalOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submitSchedule} isLoading={saving}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label={t("grades.class")}
            value={scheduleForm.class_id}
            onChange={(event) =>
              setScheduleForm({ ...scheduleForm, class_id: Number(event.target.value) })
            }
          >
            <option value={0} disabled>
              {t("common.select")}
            </option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </Select>

          <Select
            label={t("grades.subject")}
            value={scheduleForm.subject_id}
            onChange={(event) =>
              setScheduleForm({ ...scheduleForm, subject_id: Number(event.target.value) })
            }
          >
            <option value={0} disabled>
              {t("common.select")}
            </option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>

          <Select
            label={t("grades.academic_year")}
            value={scheduleForm.academic_year_id}
            onChange={(event) =>
              setScheduleForm({ ...scheduleForm, academic_year_id: Number(event.target.value) })
            }
          >
            <option value={0} disabled>
              {t("common.select")}
            </option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </Select>

          <Select
            label={t("schedule.day")}
            value={scheduleForm.day_of_week}
            onChange={(event) =>
              setScheduleForm({ ...scheduleForm, day_of_week: event.target.value as DayOfWeek })
            }
          >
            {weekDays.map((day) => (
              <option key={day} value={day}>
                {t(`schedule.day_${day}`)}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="time"
              label={t("schedule.start_time")}
              value={scheduleForm.start_time}
              onChange={(event) => setScheduleForm({ ...scheduleForm, start_time: event.target.value })}
            />
            <Input
              type="time"
              label={t("schedule.end_time")}
              value={scheduleForm.end_time}
              onChange={(event) => setScheduleForm({ ...scheduleForm, end_time: event.target.value })}
            />
          </div>

          <Select
            label={t("teachers.title")}
            value={scheduleForm.teacher_id ?? 0}
            onChange={(event) =>
              setScheduleForm({ ...scheduleForm, teacher_id: Number(event.target.value) || null })
            }
          >
            <option value={0}>{t("schedule.no_teacher")}</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.first_name} {teacher.last_name}
              </option>
            ))}
          </Select>

          <Select
            label={t("schedule.room")}
            value={scheduleForm.room_id ?? 0}
            onChange={(event) =>
              setScheduleForm({ ...scheduleForm, room_id: Number(event.target.value) || null })
            }
          >
            <option value={0}>{t("schedule.no_room")}</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
                {room.code ? ` (${room.code})` : ""}
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      <Modal
        open={roomModalOpen}
        title={editingRoom ? t("schedule.edit_room") : t("schedule.create_room")}
        onClose={() => setRoomModalOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setRoomModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submitRoom} isLoading={saving}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t("schedule.room")}
            value={roomForm.name}
            onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("schedule.room_code")}
              value={roomForm.code ?? ""}
              onChange={(event) => setRoomForm({ ...roomForm, code: event.target.value })}
            />
            <Input
              label={t("schedule.room_capacity")}
              type="number"
              value={roomForm.capacity ?? ""}
              onChange={(event) =>
                setRoomForm({ ...roomForm, capacity: Number(event.target.value) || null })
              }
            />
          </div>
          <Input
            label={t("schedule.room_type")}
            value={roomForm.type ?? ""}
            onChange={(event) => setRoomForm({ ...roomForm, type: event.target.value })}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deletingSchedule !== null}
        title={t("schedule.delete")}
        message={t("admin.confirm_delete")}
        onConfirm={confirmDeleteSchedule}
        onCancel={() => setDeletingSchedule(null)}
        loading={saving}
      />
      <ConfirmDialog
        open={deletingRoom !== null}
        title={t("schedule.delete_room")}
        message={t("admin.confirm_delete")}
        onConfirm={confirmDeleteRoom}
        onCancel={() => setDeletingRoom(null)}
        loading={saving}
      />
    </div>
  );
}
