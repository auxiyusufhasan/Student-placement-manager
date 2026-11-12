import { create } from "zustand";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

function getErrorMessage(error) {
  return error.response?.data?.error || "Could not connect to the server. Please try again.";
}

const useStudentStore = create((set) => ({
  students: [],
  roles: [],
  loading: false,
  saving: false,
  error: "",
  success: "",

  fetchStudents: async () => {
    set({ loading: true, error: "", success: "" });
    try {
      const response = await api.get("/students");
      set({ students: response.data, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false });
    }
  },

  fetchRoles: async () => {
    try {
      const response = await api.get("/roles");
      set({ roles: response.data });
    } catch (error) { set({ error: getErrorMessage(error) }); }
  },

  addRole: async (role) => {
    set({ saving: true, error: "", success: "" });
    try {
      const response = await api.post("/roles", role);
      set((state) => ({ roles: [...state.roles, response.data], saving: false, success: "Role added." }));
      return true;
    } catch (error) { set({ error: getErrorMessage(error), saving: false }); return false; }
  },

  removeRole: async (id) => {
    try {
      await api.delete(`/roles/${id}`);
      set((state) => ({ roles: state.roles.filter((role) => role.id !== id), success: "Role removed." }));
    } catch (error) { set({ error: getErrorMessage(error) }); }
  },

  addStudent: async (student) => {
    set({ saving: true, error: "", success: "" });
    try {
      const response = await api.post("/students", student);
      set((state) => ({
        students: [response.data, ...state.students],
        saving: false,
        success: "Student added successfully.",
      }));
      return response.data;
    } catch (error) {
      set({ error: getErrorMessage(error), saving: false });
      return false;
    }
  },

  editStudent: async (id, student) => {
    set({ saving: true, error: "", success: "" });
    try {
      const response = await api.put(`/students/${id}`, student);
      set((state) => ({
        students: state.students.map((current) =>
          current.id === id ? response.data : current,
        ),
        saving: false,
        success: "Student updated successfully.",
      }));
      return response.data;
    } catch (error) {
      set({ error: getErrorMessage(error), saving: false });
      return false;
    }
  },

  uploadCv: async (id, file) => {
    set({ saving: true, error: "", success: "" });
    try {
      const response = await api.post(`/students/${id}/cv`, file, {
        params: { filename: file.name },
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      set((state) => ({
        students: state.students.map((student) => student.id === id ? { ...student, cv_file_name: response.data.cv_file_name } : student),
        saving: false,
        success: "Student CV uploaded successfully.",
      }));
      return true;
    } catch (error) {
      set({ error: getErrorMessage(error), saving: false });
      return false;
    }
  },

  bulkUpdateStatus: async (ids, placement_status) => {
    set({ saving: true, error: "", success: "" });
    try {
      const response = await api.patch("/students/bulk-status", { ids, placement_status });
      const byId = new Map(response.data.students.map((student) => [student.id, student]));
      set((state) => ({
        students: state.students.map((student) => byId.get(student.id) || student),
        saving: false,
        success: `Updated ${response.data.updated} student status${response.data.updated === 1 ? "" : "es"}.`,
      }));
      return true;
    } catch (error) {
      set({ error: getErrorMessage(error), saving: false });
      return false;
    }
  },

  importStudents: async (records) => {
    set({ saving: true, error: "", success: "" });
    let imported = 0;
    const failures = [];
    for (const record of records) {
      try {
        const response = await api.post("/students", record);
        imported += 1;
        set((state) => ({ students: [response.data, ...state.students] }));
      } catch (error) {
        failures.push(`${record.email || record.name || "Row"}: ${getErrorMessage(error)}`);
      }
    }
    set({ saving: false, success: `Imported ${imported} student${imported === 1 ? "" : "s"}${failures.length ? `; ${failures.length} row${failures.length === 1 ? "" : "s"} skipped` : ""}.`, error: failures.slice(0, 3).join(" ") });
    return imported;
  },

  removeStudent: async (id) => {
    set({ error: "", success: "" });
    try {
      await api.delete(`/students/${id}`);
      set((state) => ({
        students: state.students.filter((student) => student.id !== id),
        success: "Student deleted successfully.",
      }));
      return true;
    } catch (error) {
      set({ error: getErrorMessage(error) });
      return false;
    }
  },

  clearStudents: async () => {
    set({ error: "", success: "" });
    try {
      await api.delete("/students");
      set({ students: [], success: "All student records cleared." });
      return true;
    } catch (error) {
      set({ error: getErrorMessage(error) });
      return false;
    }
  },

  clearMessages: () => set({ error: "", success: "" }),
}));

export default useStudentStore;
