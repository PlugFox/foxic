import {
    collection,
    doc,
    FieldValue,
    getDoc,
    onSnapshot,
    serverTimestamp,
    setDoc,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { firestore } from '../config/firebase';

// Типы данных согласно FIRESTORE.md
export interface ProjectInfo {
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  name: string;
  lastAccessed: Timestamp | FieldValue;
  notifications: number;
  pinned: boolean;
}

export interface UserProjectsData {
  projects: Record<string, ProjectInfo>;
  updatedAt: Timestamp | FieldValue;
}

export interface ProjectMember {
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  email: string;
  name: string;
  avatar?: string;
  added: Timestamp | FieldValue;
  lastActive?: Timestamp | FieldValue;
  invitedBy: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner: string;
  members: Record<string, ProjectMember>;
  visibility: 'private' | 'link' | 'public';
  tags: string[];
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface CreateProjectData {
  name: string;
  description: string;
  visibility?: 'private' | 'link' | 'public';
  tags?: string[];
}

class ProjectsService {
  // Подписка на изменения проектов пользователя
  subscribeToUserProjects(
    userId: string,
    callback: (projects: Record<string, ProjectInfo>) => void
  ): () => void {
    const userProjectsRef = doc(firestore, `users/${userId}/data/projects`);

    return onSnapshot(userProjectsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProjectsData;
        callback(data.projects || {});
      } else {
        callback({});
      }
    }, (error) => {
      console.error('Ошибка подписки на проекты пользователя:', error);
      callback({});
    });
  }

  // Создание нового проекта
  async createProject(
    userId: string,
    userEmail: string,
    userName: string,
    userAvatar: string | null,
    projectData: CreateProjectData
  ): Promise<string> {
    const batch = writeBatch(firestore);
    const projectId = doc(collection(firestore, 'projects')).id;

    const now = serverTimestamp();

    // Создаем проект
    const projectRef = doc(firestore, `projects/${projectId}`);
    const project: Omit<Project, 'id'> = {
      name: projectData.name,
      description: projectData.description,
      owner: userId,
      members: {
        [userId]: {
          role: 'owner',
          email: userEmail,
          name: userName,
          avatar: userAvatar || undefined,
          added: now,
          lastActive: now,
          invitedBy: userId
        }
      },
      visibility: projectData.visibility || 'private',
      tags: projectData.tags || [],
      createdAt: now,
      updatedAt: now
    };

    batch.set(projectRef, project);

    // Обновляем список проектов пользователя
    const userProjectsRef = doc(firestore, `users/${userId}/data/projects`);
    const userProjectsSnapshot = await getDoc(userProjectsRef);

    let userProjects: Record<string, ProjectInfo> = {};
    if (userProjectsSnapshot.exists()) {
      const data = userProjectsSnapshot.data() as UserProjectsData;
      userProjects = data.projects || {};
    }

    userProjects[projectId] = {
      role: 'owner',
      name: projectData.name,
      lastAccessed: now,
      notifications: 0,
      pinned: false
    };

    batch.set(userProjectsRef, {
      projects: userProjects,
      updatedAt: now
    });

    await batch.commit();
    return projectId;
  }

  // Удаление проекта
  async deleteProject(userId: string, projectId: string): Promise<void> {
    const batch = writeBatch(firestore);

    // Получаем проект для проверки прав
    const projectRef = doc(firestore, `projects/${projectId}`);
    const projectSnapshot = await getDoc(projectRef);

    if (!projectSnapshot.exists()) {
      throw new Error('Проект не найден');
    }

    const project = projectSnapshot.data() as Omit<Project, 'id'>;

    // Проверяем права на удаление (только owner)
    if (project.owner !== userId) {
      throw new Error('Недостаточно прав для удаления проекта');
    }

    // Удаляем проект
    batch.delete(projectRef);

    // Удаляем проект из списков всех участников
    for (const memberId of Object.keys(project.members)) {
      const memberProjectsRef = doc(firestore, `users/${memberId}/data/projects`);
      const memberProjectsSnapshot = await getDoc(memberProjectsRef);

      if (memberProjectsSnapshot.exists()) {
        const memberData = memberProjectsSnapshot.data() as UserProjectsData;
        const memberProjects = { ...memberData.projects };
        delete memberProjects[projectId];

        batch.set(memberProjectsRef, {
          projects: memberProjects,
          updatedAt: serverTimestamp()
        });
      }
    }

    await batch.commit();
  }

  // Получение данных проекта
  async getProject(projectId: string): Promise<Project | null> {
    const projectRef = doc(firestore, `projects/${projectId}`);
    const snapshot = await getDoc(projectRef);

    if (snapshot.exists()) {
      return {
        id: projectId,
        ...snapshot.data()
      } as Project;
    }

    return null;
  }

  // Обновление времени последнего доступа к проекту
  async updateLastAccess(userId: string, projectId: string): Promise<void> {
    const userProjectsRef = doc(firestore, `users/${userId}/data/projects`);
    const snapshot = await getDoc(userProjectsRef);

    if (snapshot.exists()) {
      const data = snapshot.data() as UserProjectsData;
      const projects = { ...data.projects };

      if (projects[projectId]) {
        projects[projectId].lastAccessed = serverTimestamp();

        await setDoc(userProjectsRef, {
          projects,
          updatedAt: serverTimestamp()
        });
      }
    }
  }

  // Переключение закрепления проекта
  async toggleProjectPin(userId: string, projectId: string): Promise<void> {
    const userProjectsRef = doc(firestore, `users/${userId}/data/projects`);
    const snapshot = await getDoc(userProjectsRef);

    if (snapshot.exists()) {
      const data = snapshot.data() as UserProjectsData;
      const projects = { ...data.projects };

      if (projects[projectId]) {
        projects[projectId].pinned = !projects[projectId].pinned;

        await setDoc(userProjectsRef, {
          projects,
          updatedAt: serverTimestamp()
        });
      }
    }
  }
}

export const projectsService = new ProjectsService();