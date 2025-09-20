import { Navigate } from '@solidjs/router';
import { Component, ParentComponent, Show } from 'solid-js';
import { useAuth } from '../contexts/auth.context';

export const ProtectedRoute: ParentComponent = (props) => {
  const { user, loading } = useAuth();

  return (
    <Show when={!loading()} fallback={<div class="loading">Загрузка...</div>}>
      <Show when={user()} fallback={<Navigate href="/login" />}>
        {props.children}
      </Show>
    </Show>
  );
};

export const PublicRoute: ParentComponent = (props) => {
  const { user, loading } = useAuth();

  return (
    <Show when={!loading()} fallback={<div class="loading">Загрузка...</div>}>
      <Show when={!user()} fallback={<Navigate href="/" />}>
        {props.children}
      </Show>
    </Show>
  );
};

export const CatchAllRoute: Component = () => {
  const { user, loading } = useAuth();

  return (
    <Show when={!loading()} fallback={<div class="loading">Загрузка...</div>}>
      <Show when={user()} fallback={<Navigate href="/login" />}>
        <Navigate href="/" />
      </Show>
    </Show>
  );
};