// ═══════════════════════════════════════════════════════════════
// 📊 Projects Store - Global state management for projects
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Project, ProjectWithStats } from '../schemas/projectSchema';

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

interface ProjectsState {
  // Data
  projects: Project[];
  projectsWithStats: ProjectWithStats[];
  currentProject: Project | null;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Error states
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  fetchProjectsWithStats: () => Promise<void>;
  fetchProject: (id: number) => Promise<void>;
  createProject: (data: { name: string; description?: string }) => Promise<Project | null>;
  updateProject: (id: number, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  clearError: () => void;
}

// ───────────────────────────────────────────────────────────────
// Store
// ───────────────────────────────────────────────────────────────

export const useProjectsStore = create<ProjectsState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        projects: [],
        projectsWithStats: [],
        currentProject: null,
        isLoading: false,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        error: null,

        // Fetch all projects
        fetchProjects: async () => {
          set({ isLoading: true, error: null }, false, 'projects/fetchProjects');

          try {
            // NOTE: API integration pending - using empty array until backend endpoint is ready
            // Future: Replace with apiClient.get<Project[]>('/api/projects', { schema: z.array(ProjectSchema) })
            const projects: Project[] = [];

            set({
              projects,
              isLoading: false
            }, false, 'projects/fetchProjects/success');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects';
            set({
              error: errorMessage,
              isLoading: false
            }, false, 'projects/fetchProjects/error');
            simpleLogger.error('❌ Failed to fetch projects:', error);
          }
        },

        // Fetch projects with statistics
        fetchProjectsWithStats: async () => {
          set({ isLoading: true, error: null }, false, 'projects/fetchProjectsWithStats');

          try {
            // NOTE: API integration pending - using empty array until backend endpoint is ready
            const projectsWithStats: ProjectWithStats[] = [];

            set({
              projectsWithStats,
              isLoading: false
            }, false, 'projects/fetchProjectsWithStats/success');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects with stats';
            set({
              error: errorMessage,
              isLoading: false
            }, false, 'projects/fetchProjectsWithStats/error');
            simpleLogger.error('❌ Failed to fetch projects with stats:', error);
          }
        },

        // Fetch single project
        fetchProject: async (id: number) => {
          set({ isLoading: true, error: null }, false, 'projects/fetchProject');

          try {
            // NOTE: API integration pending - using in-memory lookup until backend endpoint is ready
            const project = get().projects.find(p => p.id === id) || null;

            set({
              currentProject: project,
              isLoading: false
            }, false, 'projects/fetchProject/success');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch project';
            set({
              error: errorMessage,
              isLoading: false
            }, false, 'projects/fetchProject/error');
            simpleLogger.error('❌ Failed to fetch project:', error);
          }
        },

        // Create project
        createProject: async (data) => {
          set({ isCreating: true, error: null }, false, 'projects/createProject');

          try {
            // NOTE: API integration pending - using mock creation until backend endpoint is ready
            const newProject: Project = {
              id: Date.now(),
              name: data.name,
              description: data.description || null,
              status: 'draft',
              created_by: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            set(state => ({
              projects: [...state.projects, newProject],
              isCreating: false
            }), false, 'projects/createProject/success');

            simpleLogger.info('✅ Project created:', newProject);
            return newProject;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
            set({
              error: errorMessage,
              isCreating: false
            }, false, 'projects/createProject/error');
            simpleLogger.error('❌ Failed to create project:', error);
            return null;
          }
        },

        // Update project
        updateProject: async (id, data) => {
          set({ isUpdating: true, error: null }, false, 'projects/updateProject');

          try {
            // NOTE: API integration pending - using in-memory update until backend endpoint is ready
            set(state => ({
              projects: state.projects.map(p =>
                p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p
              ),
              currentProject: state.currentProject?.id === id
                ? { ...state.currentProject, ...data, updated_at: new Date().toISOString() }
                : state.currentProject,
              isUpdating: false
            }), false, 'projects/updateProject/success');

            simpleLogger.info('✅ Project updated:', id);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update project';
            set({
              error: errorMessage,
              isUpdating: false
            }, false, 'projects/updateProject/error');
            simpleLogger.error('❌ Failed to update project:', error);
          }
        },

        // Delete project
        deleteProject: async (id) => {
          set({ isDeleting: true, error: null }, false, 'projects/deleteProject');

          try {
            // NOTE: API integration pending - using in-memory delete until backend endpoint is ready
            set(state => ({
              projects: state.projects.filter(p => p.id !== id),
              currentProject: state.currentProject?.id === id ? null : state.currentProject,
              isDeleting: false
            }), false, 'projects/deleteProject/success');

            simpleLogger.info('✅ Project deleted:', id);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete project';
            set({
              error: errorMessage,
              isDeleting: false
            }, false, 'projects/deleteProject/error');
            simpleLogger.error('❌ Failed to delete project:', error);
          }
        },

        // Set current project
        setCurrentProject: (project) => {
          set({ currentProject: project }, false, 'projects/setCurrentProject');
        },

        // Clear error
        clearError: () => {
          set({ error: null }, false, 'projects/clearError');
        },
      }),
      {
        name: 'projects-storage',
        partialize: (state) => ({
          currentProject: state.currentProject,
          // Don't persist loading/error states
        }),
      }
    ),
    { name: 'ProjectsStore' }
  )
);

// ───────────────────────────────────────────────────────────────
// Selectors (for optimized component re-renders)
// ───────────────────────────────────────────────────────────────

export const selectProjects = (state: ProjectsState) => state.projects;
export const selectCurrentProject = (state: ProjectsState) => state.currentProject;
export const selectProjectsIsLoading = (state: ProjectsState) => state.isLoading;
export const selectProjectsError = (state: ProjectsState) => state.error;

