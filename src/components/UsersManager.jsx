import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const PERMISSIONS = [
  {
    key: 'view_dashboard',
    label: 'Ver Dashboard',
  },
  {
    key: 'view_lancamentos',
    label: 'Ver Lançamentos',
  },
  {
    key: 'create_lancamento',
    label: 'Criar Lançamento',
  },
  {
    key: 'edit_lancamento',
    label: 'Editar Lançamento',
  },
  {
    key: 'delete_lancamento',
    label: 'Excluir Lançamento',
  },
  {
    key: 'view_medicoes',
    label: 'Ver Medições',
  },
  {
    key: 'edit_medicoes',
    label: 'Editar Medições',
  },
  {
    key: 'view_financeiro',
    label: 'Ver Financeiro',
  },
  {
    key: 'edit_financeiro',
    label: 'Editar Financeiro',
  },
  {
    key: 'view_fornecedores',
    label: 'Ver Fornecedores',
  },
  {
    key: 'edit_fornecedores',
    label: 'Editar Fornecedores',
  },
  {
    key: 'view_relatorios',
    label: 'Ver Relatórios',
  },
  {
    key: 'manage_users',
    label: 'Gerenciar Usuários',
  },
  {
    key: 'manage_settings',
    label: 'Gerenciar Configurações',
  },
];

const DEFAULT_PERMISSIONS = {
  view_dashboard: true,
  view_lancamentos: true,
  create_lancamento: false,
  edit_lancamento: false,
  delete_lancamento: false,
  view_medicoes: true,
  edit_medicoes: false,
  view_financeiro: true,
  edit_financeiro: false,
  view_fornecedores: true,
  edit_fornecedores: false,
  view_relatorios: true,
  manage_users: false,
  manage_settings: false,
};

function getStatusLabel(status) {
  switch (status) {
    case 'approved':
      return 'Aprovado';

    case 'pending':
      return 'Pendente';

    case 'rejected':
      return 'Rejeitado';

    case 'blocked':
      return 'Bloqueado';

    default:
      return status || '-';
  }
}

function getRoleLabel(role) {
  switch (role) {
    case 'primary_admin':
      return 'Administrador principal';

    case 'admin':
      return 'Administrador';

    case 'editor':
      return 'Editor';

    case 'viewer':
      return 'Visualizador';

    default:
      return role || '-';
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'approved':
      return 'user-status approved';

    case 'pending':
      return 'user-status pending';

    case 'rejected':
      return 'user-status rejected';

    case 'blocked':
      return 'user-status blocked';

    default:
      return 'user-status';
  }
}

function getPermissionsForRole(role) {
  if (role === 'primary_admin' || role === 'admin') {
    return Object.fromEntries(
      PERMISSIONS.map((permission) => [
        permission.key,
        true,
      ])
    );
  }

  if (role === 'editor') {
    return {
      ...DEFAULT_PERMISSIONS,
      create_lancamento: true,
      edit_lancamento: true,
      edit_medicoes: true,
      edit_financeiro: true,
      edit_fornecedores: true,
    };
  }

  return {
    ...DEFAULT_PERMISSIONS,
  };
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('pt-BR');
}

export default function UsersManager({
  currentProfile,
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState('all');

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [editForm, setEditForm] = useState(null);

  const isPrimaryAdmin =
    currentProfile?.is_primary_admin === true ||
    currentProfile?.role === 'primary_admin';

  const canManageUsers =
    isPrimaryAdmin ||
    currentProfile?.role === 'admin' ||
    currentProfile?.permissions?.manage_users === true;

  async function loadUsers() {
    setLoading(true);
    setError('');
    setSuccess('');

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, username, full_name, status, role, is_primary_admin, permissions, created_at, updated_at'
      )
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(
        'Erro ao carregar usuários:',
        error
      );

      setError(
        'Não foi possível carregar os usuários.'
      );

      setUsers([]);
    } else {
      setUsers(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesStatus =
        statusFilter === 'all' ||
        user.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        String(user.full_name || '')
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(user.username || '')
          .toLowerCase()
          .includes(normalizedSearch);

      return (
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    users,
    search,
    statusFilter,
  ]);

  const pendingCount = users.filter(
    (user) => user.status === 'pending'
  ).length;

  const approvedCount = users.filter(
    (user) => user.status === 'approved'
  ).length;

  const blockedCount = users.filter(
    (user) => user.status === 'blocked'
  ).length;

  function openUser(user) {
    setSelectedUser(user);

    setEditForm({
      status: user.status,
      role: user.role,
      permissions: {
        ...DEFAULT_PERMISSIONS,
        ...(user.permissions || {}),
      },
    });

    setError('');
    setSuccess('');
  }

  function closeUser() {
    if (saving) return;

    setSelectedUser(null);
    setEditForm(null);
  }

  function changeRole(role) {
    setEditForm((prev) => ({
      ...prev,
      role,
      permissions:
        role === 'primary_admin'
          ? getPermissionsForRole(
              'primary_admin'
            )
          : getPermissionsForRole(role),
    }));
  }

  function togglePermission(key) {
    if (
      selectedUser?.is_primary_admin
    ) {
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]:
          !prev.permissions[key],
      },
    }));
  }

  async function saveUser() {
    if (!selectedUser || !editForm) {
      return;
    }

    if (
      selectedUser.is_primary_admin &&
      (
        editForm.status !== 'approved' ||
        editForm.role !== 'primary_admin'
      )
    ) {
      alert(
        'O administrador principal não pode ser bloqueado, rejeitado ou rebaixado.'
      );

      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const permissions =
      editForm.role === 'primary_admin' ||
      editForm.role === 'admin'
        ? getPermissionsForRole(
            editForm.role
          )
        : editForm.permissions;

    const {
      data,
      error,
    } = await supabase.rpc(
      'admin_update_user',
      {
        p_user_id:
          selectedUser.id,
        p_status:
          editForm.status,
        p_role:
          editForm.role,
        p_permissions:
          permissions,
      }
    );

    if (error) {
      console.error(
        'Erro ao atualizar usuário:',
        error
      );

      setError(
        error.message ||
          'Não foi possível atualizar o usuário.'
      );

      setSaving(false);

      return;
    }

    setUsers((prev) =>
      prev.map((user) =>
        user.id === selectedUser.id
          ? data
          : user
      )
    );

    setSelectedUser(null);
    setEditForm(null);

    setSuccess(
      'Usuário atualizado com sucesso.'
    );

    setSaving(false);
  }

  async function quickStatusChange(
    user,
    status
  ) {
    if (user.is_primary_admin) {
      alert(
        'O administrador principal não pode ser bloqueado ou rejeitado.'
      );

      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const permissions = {
      ...DEFAULT_PERMISSIONS,
      ...(user.permissions || {}),
    };

    const { data, error } =
      await supabase.rpc(
        'admin_update_user',
        {
          p_user_id: user.id,
          p_status: status,
          p_role:
            user.role || 'viewer',
          p_permissions:
            permissions,
        }
      );

    if (error) {
      console.error(
        'Erro ao alterar status:',
        error
      );

      setError(
        error.message ||
          'Não foi possível alterar o status.'
      );

      setSaving(false);

      return;
    }

    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id
          ? data
          : item
      )
    );

    setSuccess(
      `Usuário ${getStatusLabel(
        status
      ).toLowerCase()} com sucesso.`
    );

    setSaving(false);
  }

  if (!canManageUsers) {
    return (
      <section className="page-content">
        <div className="panel empty-page">
          <div className="empty-icon">
            🔒
          </div>

          <h2>
            Acesso restrito
          </h2>

          <p>
            Você não possui permissão
            para gerenciar usuários.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-content">
      <div className="panel">
        <div className="panel-header users-header">
          <div>
            <h2>
              Gerenciamento de usuários
            </h2>

            <p>
              Aprove, bloqueie e configure
              os acessos dos usuários do
              sistema.
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={loadUsers}
            disabled={loading || saving}
          >
            ↻ Atualizar
          </button>
        </div>

        {success && (
          <div className="users-message success-message">
            ✓ {success}
          </div>
        )}

        {error && (
          <div className="users-message error-message">
            ⚠ {error}
          </div>
        )}

        <div className="user-summary">
          <div className="user-summary-card">
            <span>
              Total
            </span>

            <strong>
              {users.length}
            </strong>
          </div>

          <div className="user-summary-card pending-card">
            <span>
              Pendentes
            </span>

            <strong>
              {pendingCount}
            </strong>
          </div>

          <div className="user-summary-card approved-card">
            <span>
              Aprovados
            </span>

            <strong>
              {approvedCount}
            </strong>
          </div>

          <div className="user-summary-card blocked-card">
            <span>
              Bloqueados
            </span>

            <strong>
              {blockedCount}
            </strong>
          </div>
        </div>

        <div className="users-toolbar">
          <div className="users-search">
            <span>
              🔎
            </span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Pesquisar por nome ou usuário..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
          >
            <option value="all">
              Todos os status
            </option>

            <option value="pending">
              Pendentes
            </option>

            <option value="approved">
              Aprovados
            </option>

            <option value="rejected">
              Rejeitados
            </option>

            <option value="blocked">
              Bloqueados
            </option>
          </select>
        </div>

        {loading ? (
          <div className="users-loading">
            Carregando usuários...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="users-empty">
            <div>
              👥
            </div>

            <strong>
              Nenhum usuário encontrado
            </strong>

            <span>
              Tente alterar os filtros
              ou aguarde novos cadastros.
            </span>
          </div>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>
                    Usuário
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Perfil
                  </th>

                  <th>
                    Cadastro
                  </th>

                  <th>
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map(
                  (user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-table-name">
                          <div className="user-table-avatar">
                            {(
                              user.full_name ||
                              user.username ||
                              'U'
                            )
                              .slice(
                                0,
                                1
                              )
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {user.full_name ||
                                'Sem nome'}
                            </strong>

                            <span>
                              @{user.username ||
                                '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            user.status
                          )}
                        >
                          {getStatusLabel(
                            user.status
                          )}
                        </span>
                      </td>

                      <td>
                        {user.is_primary_admin ? (
                          <span className="primary-admin-label">
                            👑 Administrador principal
                          </span>
                        ) : (
                          getRoleLabel(
                            user.role
                          )
                        )}
                      </td>

                      <td>
                        {formatDate(
                          user.created_at
                        )}
                      </td>

                      <td>
                        <div className="user-actions">
                          {user.status ===
                            'pending' && (
                            <button
                              className="approve-button"
                              onClick={() =>
                                quickStatusChange(
                                  user,
                                  'approved'
                                )
                              }
                              disabled={
                                saving
                              }
                            >
                              ✓ Aprovar
                            </button>
                          )}

                          {user.status ===
                            'approved' &&
                            !user.is_primary_admin && (
                              <button
                                className="block-button"
                                onClick={() =>
                                  quickStatusChange(
                                    user,
                                    'blocked'
                                  )
                                }
                                disabled={
                                  saving
                                }
                              >
                                Bloquear
                              </button>
                            )}

                          {user.status ===
                            'blocked' &&
                            !user.is_primary_admin && (
                              <button
                                className="approve-button"
                                onClick={() =>
                                  quickStatusChange(
                                    user,
                                    'approved'
                                  )
                                }
                                disabled={
                                  saving
                                }
                              >
                                Desbloquear
                              </button>
                            )}

                          <button
                            className="edit-user-button"
                            onClick={() =>
                              openUser(
                                user
                              )
                            }
                            disabled={
                              saving
                            }
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser &&
        editForm && (
          <div
            className="user-modal-overlay"
            onMouseDown={
              closeUser
            }
          >
            <div
              className="user-modal"
              onMouseDown={(e) =>
                e.stopPropagation()
              }
            >
              <div className="user-modal-header">
                <div>
                  <h2>
                    Editar usuário
                  </h2>

                  <p>
                    {selectedUser.full_name ||
                      selectedUser.username}
                  </p>
                </div>

                <button
                  className="close"
                  onClick={
                    closeUser
                  }
                  disabled={saving}
                >
                  ×
                </button>
              </div>

              <div className="user-modal-body">
                <div className="user-detail">
                  <span>
                    Usuário
                  </span>

                  <strong>
                    @{selectedUser.username ||
                      '-'}
                  </strong>
                </div>

                <div className="user-detail">
                  <span>
                    Nome
                  </span>

                  <strong>
                    {selectedUser.full_name ||
                      '-'}
                  </strong>
                </div>

                <div className="user-form-grid">
                  <div className="field">
                    <label>
                      Status
                    </label>

                    <select
                      value={
                        editForm.status
                      }
                      onChange={(e) =>
                        setEditForm(
                          (prev) => ({
                            ...prev,
                            status:
                              e.target.value,
                          })
                        )
                      }
                      disabled={
                        selectedUser.is_primary_admin
                      }
                    >
                      <option value="pending">
                        Pendente
                      </option>

                      <option value="approved">
                        Aprovado
                      </option>

                      <option value="rejected">
                        Rejeitado
                      </option>

                      <option value="blocked">
                        Bloqueado
                      </option>
                    </select>
                  </div>

                  <div className="field">
                    <label>
                      Perfil
                    </label>

                    <select
                      value={
                        editForm.role
                      }
                      onChange={(e) =>
                        changeRole(
                          e.target.value
                        )
                      }
                      disabled={
                        selectedUser.is_primary_admin
                      }
                    >
                      <option value="viewer">
                        Visualizador
                      </option>

                      <option value="editor">
                        Editor
                      </option>

                      <option value="admin">
                        Administrador
                      </option>

                      {selectedUser.is_primary_admin && (
                        <option value="primary_admin">
                          Administrador principal
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="permissions-section">
                  <div className="permissions-title">
                    <div>
                      <h3>
                        Permissões
                      </h3>

                      <p>
                        Defina exatamente
                        o que este usuário
                        poderá acessar.
                      </p>
                    </div>
                  </div>

                  <div className="permissions-grid">
                    {PERMISSIONS.map(
                      (
                        permission
                      ) => (
                        <label
                          className={`permission-item ${
                            selectedUser.is_primary_admin
                              ? 'disabled'
                              : ''
                          }`}
                          key={
                            permission.key
                          }
                        >
                          <input
                            type="checkbox"
                            checked={
                              editForm
                                .permissions[
                                permission.key
                              ] === true
                            }
                            onChange={() =>
                              togglePermission(
                                permission.key
                              )
                            }
                            disabled={
                              selectedUser.is_primary_admin
                            }
                          />

                          <span>
                            {
                              permission.label
                            }
                          </span>
                        </label>
                      )
                    )}
                  </div>
                </div>

                {selectedUser.is_primary_admin && (
                  <div className="primary-admin-warning">
                    👑 Este é o administrador
                    principal. O sistema impede
                    automaticamente que ele seja
                    bloqueado, rejeitado ou
                    rebaixado.
                  </div>
                )}
              </div>

              <div className="user-modal-actions">
                <button
                  className="secondary-button"
                  onClick={
                    closeUser
                  }
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  className="primary-button"
                  onClick={
                    saveUser
                  }
                  disabled={saving}
                >
                  {saving
                    ? 'Salvando...'
                    : 'Salvar alterações'}
                </button>
              </div>
            </div>
          </div>
        )}
    </section>
  );
}