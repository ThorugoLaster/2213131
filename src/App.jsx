import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";
import "./App.css";

const TIPOS_LANCAMENTO = [
  "Nota de Material",
  "Serviço",
  "Fatura",
  "Combustível",
  "Consumo",
];

const PERMISSION_ITEMS = [
  ["view_dashboard", "Ver Dashboard"],
  ["view_lancamentos", "Ver Lançamentos"],
  ["create_lancamento", "Criar Lançamentos"],
  ["edit_lancamento", "Editar Lançamentos"],
  ["delete_lancamento", "Excluir Lançamentos"],
  ["view_medicoes", "Ver Medições"],
  ["edit_medicoes", "Editar Medições"],
  ["view_financeiro", "Ver Financeiro"],
  ["edit_financeiro", "Editar Financeiro"],
  ["view_fornecedores", "Ver Fornecedores"],
  ["edit_fornecedores", "Editar Fornecedores"],
  ["view_relatorios", "Ver Relatórios"],
  ["manage_users", "Gerenciar Usuários"],
  ["manage_settings", "Gerenciar Configurações"],
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

const ROLE_PRESETS = {
  viewer: {
    ...DEFAULT_PERMISSIONS,
  },

  editor: {
    ...DEFAULT_PERMISSIONS,
    create_lancamento: true,
    edit_lancamento: true,
    edit_medicoes: true,
    edit_financeiro: true,
    edit_fornecedores: true,
  },

  admin: Object.fromEntries(
    PERMISSION_ITEMS.map(([key]) => [key, true])
  ),
};

const INITIAL_LANCAMENTOS = [
  {
    id: 1,
    dataEmissao: "2026-08-24",
    dataEntrada: "2026-08-24",
    tipo: "Nota de Material",
    fornecedor: "POLIMIX LTDA",
    cnpj: "00.000.000/0001-00",
    nf: "312",
    vencimento: "2026-09-10",
    lancarAte: "2026-08-26",
    valor: 37882.04,
    status: "LANÇADO",
  },
  {
    id: 2,
    dataEmissao: "2026-08-24",
    dataEntrada: "2026-08-24",
    tipo: "Nota de Material",
    fornecedor: "AÇOBUILDER",
    cnpj: "00.000.000/0001-00",
    nf: "59",
    vencimento: "2026-09-22",
    lancarAte: "2026-09-07",
    valor: 97319.04,
    status: "LANÇADO",
  },
  {
    id: 3,
    dataEmissao: "2026-08-25",
    dataEntrada: "2026-08-25",
    tipo: "Serviço",
    fornecedor: "CUIDAR LTDA",
    cnpj: "00.000.000/0001-00",
    nf: "79",
    vencimento: "2026-09-11",
    lancarAte: "2026-08-27",
    valor: 15500,
    status: "PENDENTE",
  },
  {
    id: 4,
    dataEmissao: "2026-08-26",
    dataEntrada: "2026-08-26",
    tipo: "Fatura",
    fornecedor: "SABESP",
    cnpj: "00.000.000/0001-00",
    nf: "63189077",
    vencimento: "2026-09-21",
    lancarAte: "2026-09-06",
    valor: 1677.09,
    status: "LANÇADO",
  },
  {
    id: 5,
    dataEmissao: "2026-08-27",
    dataEntrada: "2026-08-27",
    tipo: "Combustível",
    fornecedor: "AUTO POSTO CUBATÃO",
    cnpj: "00.000.000/0001-00",
    nf: "2532",
    vencimento: "2026-09-19",
    lancarAte: "2026-09-04",
    valor: 3241.48,
    status: "LANÇADO",
  },
  {
    id: 6,
    dataEmissao: "2026-08-27",
    dataEntrada: "2026-08-27",
    tipo: "Consumo",
    fornecedor: "PROTSAN1",
    cnpj: "00.000.000/0001-00",
    nf: "2234",
    vencimento: "2026-09-26",
    lancarAte: "2026-09-11",
    valor: 3298.86,
    status: "PENDENTE",
  },
  {
    id: 7,
    dataEmissao: "2026-08-28",
    dataEntrada: "2026-08-28",
    tipo: "Consumo",
    fornecedor: "KALUNGA",
    cnpj: "00.000.000/0001-00",
    nf: "15909337",
    vencimento: "2026-09-24",
    lancarAte: "2026-09-09",
    valor: 1637.01,
    status: "LANÇADO",
  },
  {
    id: 8,
    dataEmissao: "2026-08-28",
    dataEntrada: "2026-08-28",
    tipo: "Nota de Material",
    fornecedor: "M2ECOPLAC",
    cnpj: "00.000.000/0001-00",
    nf: "16946",
    vencimento: "2026-09-25",
    lancarAte: "2026-09-10",
    valor: 18450,
    status: "LANÇADO",
  },
];

const DEFAULT_SETTINGS = {
  systemName: "Controle",
  companyName: "Minha Empresa",
  primaryColor: "#2563eb",
  secondaryColor: "#0f172a",
  sidebarColor: "#111827",
  logoUrl: "",
  darkMode: false,
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("pt-BR");
}

/*
 * Feriados nacionais brasileiros.
 *
 * O cálculo de "Lançar até" começa 15 dias antes
 * do vencimento e depois retrocede caso a data
 * caia em sábado, domingo ou feriado.
 */
function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h =
    (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l =
    (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor(
    (a + 11 * h + 22 * l) / 451
  );
  const month = Math.floor(
    (h + l - 7 * m + 114) / 31
  );
  const day =
    ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(
    year,
    month - 1,
    day
  );
}

function getFeriados(year) {
  const feriados = new Set([
    `${year}-01-01`,
    `${year}-04-21`,
    `${year}-05-01`,
    `${year}-09-07`,
    `${year}-10-12`,
    `${year}-11-02`,
    `${year}-11-15`,
    `${year}-11-20`,
    `${year}-12-25`,
  ]);

  const pascoa = getEasterDate(year);

  const sextaSanta = new Date(pascoa);
  sextaSanta.setDate(
    sextaSanta.getDate() - 2
  );

  const corpusChristi = new Date(pascoa);
  corpusChristi.setDate(
    corpusChristi.getDate() + 60
  );

  const toKey = (date) => {
    const y = date.getFullYear();
    const m = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const d = String(
      date.getDate()
    ).padStart(2, "0");

    return `${y}-${m}-${d}`;
  };

  feriados.add(toKey(sextaSanta));
  feriados.add(toKey(corpusChristi));

  return feriados;
}

function isDiaUtil(date) {
  const day = date.getDay();

  if (day === 0 || day === 6) {
    return false;
  }

  const feriados = getFeriados(
    date.getFullYear()
  );

  const key = `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

  return !feriados.has(key);
}

/*
 * Regra:
 * 1. pega o vencimento
 * 2. volta 15 dias corridos
 * 3. se cair em sábado/domingo/feriado,
 *    continua voltando até encontrar o último
 *    dia útil.
 */
function calcularLancarAte(vencimento) {
  if (!vencimento) return "";

  const data = new Date(
    `${vencimento}T00:00:00`
  );

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  data.setDate(
    data.getDate() - 15
  );

  while (!isDiaUtil(data)) {
    data.setDate(
      data.getDate() - 1
    );
  }

  return `${data.getFullYear()}-${String(
    data.getMonth() + 1
  ).padStart(2, "0")}-${String(
    data.getDate()
  ).padStart(2, "0")}`;
}

function normalizePermissions(
  permissions,
  role
) {
  if (role === "admin") {
    return {
      ...ROLE_PRESETS.admin,
    };
  }

  return {
    ...DEFAULT_PERMISSIONS,
    ...(permissions || {}),
  };
}

function getStatusLabel(status) {
  const labels = {
    pending: "Aguardando aprovação",
    approved: "Aprovado",
    rejected: "Rejeitado",
    blocked: "Bloqueado",
  };

  return labels[status] || status;
}

function getRoleLabel(role, primary) {
  if (primary) {
    return "Administrador principal";
  }

  const labels = {
    admin: "Administrador",
    editor: "Editor",
    viewer: "Visualizador",
  };

  return labels[role] || role;
}

function mascaraCNPJ(value) {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 14);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(
      0,
      2
    )}.${digits.slice(2)}`;
  }

  if (digits.length <= 8) {
    return `${digits.slice(
      0,
      2
    )}.${digits.slice(
      2,
      5
    )}.${digits.slice(5)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(
      0,
      2
    )}.${digits.slice(
      2,
      5
    )}.${digits.slice(
      5,
      8
    )}/${digits.slice(8)}`;
  }

  return `${digits.slice(
    0,
    2
  )}.${digits.slice(
    2,
    5
  )}.${digits.slice(
    5,
    8
  )}/${digits.slice(
    8,
    12
  )}-${digits.slice(12)}`;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [authLoading, setAuthLoading] =
    useState(true);

  const [pagina, setPagina] =
    useState("dashboard");

  const [lancamentos, setLancamentos] =
    useState(INITIAL_LANCAMENTOS);

  const [periodo, setPeriodo] =
    useState("todos");

  const [tipoFiltro, setTipoFiltro] =
    useState("todos");

  const [
    fornecedorFiltro,
    setFornecedorFiltro,
  ] = useState("todos");

  const [
    modalLancamento,
    setModalLancamento,
  ] = useState(false);

  const [
    novoLancamento,
    setNovoLancamento,
  ] = useState({
    dataEmissao: new Date()
      .toISOString()
      .slice(0, 10),
    dataEntrada: new Date()
      .toISOString()
      .slice(0, 10),
    tipo: "Nota de Material",
    fornecedor: "",
    cnpj: "",
    nf: "",
    vencimento: "",
    lancarAte: "",
    valor: "",
    status: "PENDENTE",
  });

  const [users, setUsers] =
    useState([]);

  const [loadingUsers, setLoadingUsers] =
    useState(false);

  const [usersError, setUsersError] =
    useState("");

  const [userFilter, setUserFilter] =
    useState("Todos");

  const [editingUser, setEditingUser] =
    useState(null);

  const [savingUser, setSavingUser] =
    useState(false);

  const [userForm, setUserForm] =
    useState({
      status: "pending",
      role: "viewer",
      permissions: {
        ...ROLE_PRESETS.viewer,
      },
    });

  const [userNotice, setUserNotice] =
    useState("");

  const [settings, setSettings] =
    useState(DEFAULT_SETTINGS);

  const [settingsSaved, setSettingsSaved] =
    useState(false);

  const [accountForm, setAccountForm] =
    useState({
      fullName: "",
      username: "",
      email: "",
    });

  const [accountSaving, setAccountSaving] =
    useState(false);

  const [passwordForm, setPasswordForm] =
    useState({
      password: "",
      confirmPassword: "",
    });

  const [
    passwordSaving,
    setPasswordSaving,
  ] = useState(false);

  const [emailForm, setEmailForm] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const isApproved =
    perfil?.status === "approved";

  const isPrimaryAdmin = Boolean(
    perfil?.is_primary_admin
  );

  const isAdmin =
    isApproved &&
    (perfil?.role === "admin" ||
      isPrimaryAdmin);

  const isBlocked =
    perfil?.status === "rejected" ||
    perfil?.status === "blocked";

  const permissions = useMemo(
    () =>
      normalizePermissions(
        perfil?.permissions,
        perfil?.role
      ),
    [perfil]
  );

  const hasPermission =
    useCallback(
      (permission) => {
        if (isAdmin) return true;

        return Boolean(
          permissions?.[permission]
        );
      },
      [isAdmin, permissions]
    );

  const loadProfile = useCallback(
    async (
      userId,
      userEmail = ""
    ) => {
      if (!userId) return null;

      const { data, error } =
        await supabase
          .from("profiles")
          .select(
            "id, username, full_name, status, role, is_primary_admin, permissions, created_at"
          )
          .eq("id", userId)
          .maybeSingle();

      if (error) {
        console.error(
          "Erro ao carregar perfil:",
          error
        );
        return null;
      }

      if (data) {
        setPerfil(data);

        setAccountForm({
          fullName:
            data.full_name || "",
          username:
            data.username || "",
          email:
            userEmail || "",
        });

        setEmailForm(
          userEmail || ""
        );
      }

      return data;
    },
    []
  );

  useEffect(() => {
    const savedSettings =
      localStorage.getItem(
        "controle-system-settings"
      );

    if (savedSettings) {
      try {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...JSON.parse(
            savedSettings
          ),
        });
      } catch {
        setSettings(
          DEFAULT_SETTINGS
        );
      }
    }
  }, []);

  useEffect(() => {
    const root =
      document.documentElement;

    root.style.setProperty(
      "--primary-color",
      settings.primaryColor
    );

    root.style.setProperty(
      "--secondary-color",
      settings.secondaryColor
    );

    root.style.setProperty(
      "--sidebar-color",
      settings.sidebarColor
    );

    root.style.setProperty(
      "--primary-color-hover",
      settings.primaryColor
    );

    if (settings.darkMode) {
      root.classList.add(
        "controle-dark"
      );
    } else {
      root.classList.remove(
        "controle-dark"
      );
    }

    return () => {
      root.classList.remove(
        "controle-dark"
      );
    };
  }, [settings]);

  useEffect(() => {
    let mounted = true;

    async function inicializar() {
      const {
        data: {
          session: currentSession,
        },
      } =
        await supabase.auth.getSession();

      if (!mounted) return;

      setSession(currentSession);

      if (currentSession?.user) {
        await loadProfile(
          currentSession.user.id,
          currentSession.user.email ||
            ""
        );
      } else {
        setPerfil(null);
      }

      if (mounted) {
        setAuthLoading(false);
      }
    }

    inicializar();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, currentSession) => {
          if (!mounted) return;

          setSession(currentSession);

          if (currentSession?.user) {
            setTimeout(() => {
              if (!mounted) return;

              loadProfile(
                currentSession.user.id,
                currentSession.user.email ||
                  ""
              ).then(() => {
                if (mounted) {
                  setAuthLoading(
                    false
                  );
                }
              });
            }, 0);
          } else {
            setPerfil(null);
            setAuthLoading(false);
          }
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    if (perfil?.status === "approved") {
      return;
    }

    const interval = setInterval(
      () => {
        loadProfile(
          session.user.id,
          session.user.email || ""
        );
      },
      5000
    );

    return () =>
      clearInterval(interval);
  }, [
    session?.user?.id,
    session?.user?.email,
    perfil?.status,
    loadProfile,
  ]);

  const loadUsers = useCallback(
    async () => {
      if (!isAdmin) return;

      setLoadingUsers(true);
      setUsersError("");

      const { data, error } =
        await supabase
          .from("profiles")
          .select(
            "id, username, full_name, status, role, is_primary_admin, permissions, created_at, updated_at"
          )
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        console.error(error);

        setUsersError(
          "Não foi possível carregar os usuários."
        );

        setUsers([]);
      } else {
        setUsers(data || []);
      }

      setLoadingUsers(false);
    },
    [isAdmin]
  );

  useEffect(() => {
    if (!isAdmin) return;
    if (pagina !== "configuracoes") {
      return;
    }

    loadUsers();
  }, [
    pagina,
    isAdmin,
    loadUsers,
  ]);

  const fornecedores = useMemo(
    () => [
      ...new Set(
        lancamentos
          .map(
            (item) =>
              item.fornecedor
          )
          .filter(Boolean)
      ),
    ],
    [lancamentos]
  );

  const filteredLancamentos =
    useMemo(() => {
      let lista = [
        ...lancamentos,
      ];

      if (periodo !== "todos") {
        const hoje = new Date();

        if (periodo === "mes") {
          lista = lista.filter(
            (item) => {
              const d = new Date(
                `${item.dataEntrada}T00:00:00`
              );

              return (
                d.getMonth() ===
                  hoje.getMonth() &&
                d.getFullYear() ===
                  hoje.getFullYear()
              );
            }
          );
        }

        if (periodo === "semana") {
          const inicio =
            new Date(hoje);

          const diaSemana =
            inicio.getDay();

          const diferenca =
            diaSemana === 0
              ? 6
              : diaSemana - 1;

          inicio.setDate(
            inicio.getDate() -
              diferenca
          );

          inicio.setHours(
            0,
            0,
            0,
            0
          );

          lista = lista.filter(
            (item) => {
              const d = new Date(
                `${item.dataEntrada}T00:00:00`
              );

              return d >= inicio;
            }
          );
        }
      }

      if (tipoFiltro !== "todos") {
        lista = lista.filter(
          (item) =>
            item.tipo === tipoFiltro
        );
      }

      if (
        fornecedorFiltro !==
        "todos"
      ) {
        lista = lista.filter(
          (item) =>
            item.fornecedor ===
            fornecedorFiltro
        );
      }

      return lista;
    }, [
      lancamentos,
      periodo,
      tipoFiltro,
      fornecedorFiltro,
    ]);

  const dashboardStats = useMemo(
    () => {
      const total =
        filteredLancamentos.length;

      const lancados =
        filteredLancamentos.filter(
          (item) =>
            item.status ===
            "LANÇADO"
        ).length;

      const pendentes =
        filteredLancamentos.filter(
          (item) =>
            item.status ===
            "PENDENTE"
        ).length;

      const valorTotal =
        filteredLancamentos.reduce(
          (acc, item) =>
            acc +
            Number(
              item.valor || 0
            ),
          0
        );

      const media =
        total > 0
          ? valorTotal / total
          : 0;

      return {
        total,
        lancados,
        pendentes,
        valorTotal,
        media,
      };
    },
    [filteredLancamentos]
  );

  function resetNovoLancamento() {
    const hoje =
      new Date()
        .toISOString()
        .slice(0, 10);

    setNovoLancamento({
      dataEmissao: hoje,
      dataEntrada: hoje,
      tipo: "Nota de Material",
      fornecedor: "",
      cnpj: "",
      nf: "",
      vencimento: "",
      lancarAte: "",
      valor: "",
      status: "PENDENTE",
    });
  }

  function abrirNovoLancamento() {
    if (
      !hasPermission(
        "create_lancamento"
      )
    ) {
      setNotice(
        "Você não possui permissão para criar lançamentos."
      );
      return;
    }

    resetNovoLancamento();
    setModalLancamento(true);
  }

  function alterarCampoLancamento(
    campo,
    valor
  ) {
    setNovoLancamento(
      (prev) => {
        const atualizado = {
          ...prev,
          [campo]: valor,
        };

        if (
          campo === "vencimento"
        ) {
          atualizado.lancarAte =
            calcularLancarAte(
              valor
            );
        }

        return atualizado;
      }
    );
  }

  function salvarLancamento(event) {
    event.preventDefault();

    if (
      !hasPermission(
        "create_lancamento"
      )
    ) {
      return;
    }

    if (
      !novoLancamento
        .dataEmissao ||
      !novoLancamento
        .dataEntrada ||
      !novoLancamento
        .tipo ||
      !novoLancamento
        .fornecedor ||
      !novoLancamento
        .cnpj ||
      !novoLancamento
        .nf ||
      !novoLancamento
        .vencimento ||
      !novoLancamento
        .valor
    ) {
      setNotice(
        "Preencha todos os campos obrigatórios do lançamento."
      );
      return;
    }

    const novo = {
      id: Date.now(),
      ...novoLancamento,
      cnpj: mascaraCNPJ(
        novoLancamento.cnpj
      ),
      lancarAte:
        calcularLancarAte(
          novoLancamento.vencimento
        ),
      valor: Number(
        novoLancamento.valor
      ),
      status:
        novoLancamento.status ===
        "LANÇADO"
          ? "LANÇADO"
          : "PENDENTE",
    };

    setLancamentos(
      (prev) => [
        novo,
        ...prev,
      ]
    );

    setModalLancamento(false);

    setNotice(
      "Lançamento criado com sucesso."
    );
  }

  function alterarStatusLancamento(
    id,
    marcado
  ) {
    if (
      !hasPermission(
        "edit_lancamento"
      ) &&
      !hasPermission(
        "create_lancamento"
      )
    ) {
      setNotice(
        "Você não possui permissão para alterar o status."
      );
      return;
    }

    setLancamentos(
      (prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: marcado
                  ? "LANÇADO"
                  : "PENDENTE",
              }
            : item
        )
    );
  }

  function navegar(
    paginaDestino
  ) {
    setNotice("");

    if (
      paginaDestino ===
        "configuracoes" &&
      !isAdmin
    ) {
      return;
    }

    const permissaoPorPagina = {
      dashboard:
        "view_dashboard",
      lancamentos:
        "view_lancamentos",
      medicoes:
        "view_medicoes",
      financeiro:
        "view_financeiro",
      fornecedores:
        "view_fornecedores",
      relatorios:
        "view_relatorios",
    };

    const permissao =
      permissaoPorPagina[
        paginaDestino
      ];

    if (
      permissao &&
      !hasPermission(permissao)
    ) {
      setNotice(
        "Você não possui permissão para acessar esta área."
      );
      return;
    }

    setPagina(
      paginaDestino
    );
  }

  async function logout() {
    await supabase.auth.signOut();

    setSession(null);
    setPerfil(null);
    setPagina("dashboard");
  }

  function salvarConfiguracoes() {
    localStorage.setItem(
      "controle-system-settings",
      JSON.stringify(settings)
    );

    setSettingsSaved(true);

    setTimeout(
      () =>
        setSettingsSaved(false),
      2500
    );
  }

  function abrirEdicaoUsuario(
    user
  ) {
    setEditingUser(user);

    const role =
      user.role || "viewer";

    setUserForm({
      status:
        user.status ||
        "pending",
      role,
      permissions:
        normalizePermissions(
          user.permissions,
          role
        ),
    });

    setUserNotice("");
  }

  function alterarRoleUsuario(
    role
  ) {
    setUserForm(
      (prev) => ({
        ...prev,
        role,
        permissions:
          normalizePermissions(
            ROLE_PRESETS[
              role
            ],
            role
          ),
      })
    );
  }

  async function alterarStatusRapido(
    user,
    status
  ) {
    if (
      user.is_primary_admin ||
      user.id ===
        session?.user?.id
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("profiles")
        .update({ status })
        .eq("id", user.id);

    if (error) {
      setUsersError(
        "Não foi possível alterar o status do usuário."
      );
      return;
    }

    await loadUsers();
  }

  async function salvarUsuario() {
    if (!editingUser) return;

    if (
      editingUser.is_primary_admin ||
      editingUser.id ===
        session?.user?.id
    ) {
      return;
    }

    setSavingUser(true);
    setUsersError("");

    const permissions =
      userForm.role ===
      "admin"
        ? ROLE_PRESETS.admin
        : userForm.permissions;

    const { error } =
      await supabase
        .from("profiles")
        .update({
          status:
            userForm.status,
          role: userForm.role,
          permissions,
        })
        .eq(
          "id",
          editingUser.id
        );

    if (error) {
      console.error(error);

      setUsersError(
        "Não foi possível salvar o usuário."
      );

      setSavingUser(false);
      return;
    }

    setEditingUser(null);
    setSavingUser(false);

    await loadUsers();
  }

  async function salvarMinhaConta() {
    if (!session?.user?.id)
      return;

    setAccountSaving(true);
    setNotice("");

    const username =
      accountForm.username
        .trim()
        .toLowerCase();

    if (
      username &&
      !/^[a-zA-Z0-9._-]+$/.test(
        username
      )
    ) {
      setNotice(
        "O username pode conter apenas letras, números, ponto, hífen e underline."
      );

      setAccountSaving(false);
      return;
    }

    const { error } =
      await supabase
        .from("profiles")
        .update({
          full_name:
            accountForm.fullName.trim(),
          username,
        })
        .eq(
          "id",
          session.user.id
        );

    if (error) {
      console.error(error);

      setNotice(
        error.code === "23505"
          ? "Esse username já está sendo utilizado."
          : "Não foi possível salvar os dados."
      );

      setAccountSaving(false);
      return;
    }

    await loadProfile(
      session.user.id,
      session.user.email ||
        ""
    );

    setNotice(
      "Dados da conta atualizados."
    );

    setAccountSaving(false);
  }

  async function alterarMinhaSenha() {
    if (
      !passwordForm.password ||
      !passwordForm.confirmPassword
    ) {
      setNotice(
        "Preencha as duas senhas."
      );
      return;
    }

    if (
      passwordForm.password
        .length < 6
    ) {
      setNotice(
        "A senha deve possuir pelo menos 6 caracteres."
      );
      return;
    }

    if (
      passwordForm.password !==
      passwordForm.confirmPassword
    ) {
      setNotice(
        "As senhas não coincidem."
      );
      return;
    }

    setPasswordSaving(true);
    setNotice("");

    const { error } =
      await supabase.auth.updateUser(
        {
          password:
            passwordForm.password,
        }
      );

    if (error) {
      setNotice(
        "Não foi possível alterar a senha."
      );
    } else {
      setNotice(
        "Senha alterada com sucesso."
      );

      setPasswordForm({
        password: "",
        confirmPassword: "",
      });
    }

    setPasswordSaving(false);
  }

  async function alterarMeuEmail() {
    if (!emailForm.trim()) {
      setNotice(
        "Informe um e-mail válido."
      );
      return;
    }

    setAccountSaving(true);
    setNotice("");

    const { error } =
      await supabase.auth.updateUser(
        {
          email: emailForm
            .trim()
            .toLowerCase(),
        }
      );

    if (error) {
      setNotice(
        "Não foi possível solicitar a alteração do e-mail."
      );
    } else {
      setNotice(
        "Solicitação enviada. Verifique seu e-mail para confirmar a alteração."
      );
    }

    setAccountSaving(false);
  }

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner" />
        <strong>
          Carregando sistema...
        </strong>
      </div>
    );
  }

  if (!session) {
    return (
      <Login
        onLogin={() => {}}
      />
    );
  }

  if (!perfil) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner" />
        <strong>
          Carregando seu perfil...
        </strong>
      </div>
    );
  }

  if (
    perfil.status ===
    "pending"
  ) {
    return (
      <div className="account-status-screen">
        <div className="account-status-card">
          <div className="account-status-icon">
            ⏳
          </div>

          <h1>
            Aguardando aprovação
          </h1>

          <p>
            Sua conta foi criada,
            mas ainda precisa ser
            aprovada por um
            administrador.
          </p>

          <strong>
            {perfil.full_name ||
              perfil.username}
          </strong>

          <span>
            O sistema verificará
            automaticamente quando
            sua conta for aprovada.
          </span>

          <button
            className="secondary-button"
            onClick={logout}
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="account-status-screen blocked">
        <div className="account-status-card">
          <div className="account-status-icon">
            🚫
          </div>

          <h1>
            {perfil.status ===
            "blocked"
              ? "Conta bloqueada"
              : "Conta rejeitada"}
          </h1>

          <p>
            Esta conta não possui
            acesso ao sistema neste
            momento.
          </p>

          <button
            className="secondary-button"
            onClick={logout}
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  const usuariosFiltrados =
    users.filter((user) => {
      if (
        userFilter === "Todos"
      ) {
        return true;
      }

      return (
        user.status ===
        userFilter
      );
    });

  const pendingUsers =
    users.filter(
      (user) =>
        user.status ===
        "pending"
    ).length;

  return (
    <div
      className="app-shell"
      style={{
        "--primary-color":
          settings.primaryColor,
        "--secondary-color":
          settings.secondaryColor,
        "--sidebar-color":
          settings.sidebarColor,
      }}
    >
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
              />
            ) : (
              "C"
            )}
          </div>

          <div>
            <strong>
              {settings.systemName}
            </strong>

            <span>
              {settings.companyName}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {hasPermission(
            "view_dashboard"
          ) && (
            <button
              className={
                pagina ===
                "dashboard"
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                navegar(
                  "dashboard"
                )
              }
            >
              <span>▦</span>
              Dashboard
            </button>
          )}

          {hasPermission(
            "view_lancamentos"
          ) && (
            <button
              className={
                pagina ===
                "lancamentos"
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                navegar(
                  "lancamentos"
                )
              }
            >
              <span>▤</span>
              Lançamentos
            </button>
          )}

          {hasPermission(
            "view_medicoes"
          ) && (
            <button
              className={
                pagina ===
                "medicoes"
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                navegar("medicoes")
              }
            >
              <span>◫</span>
              Medições
            </button>
          )}

          {hasPermission(
            "view_financeiro"
          ) && (
            <button
              className={
                pagina ===
                "financeiro"
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                navegar(
                  "financeiro"
                )
              }
            >
              <span>R$</span>
              Financeiro
            </button>
          )}

          {hasPermission(
            "view_fornecedores"
          ) && (
            <button
              className={
                pagina ===
                "fornecedores"
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                navegar(
                  "fornecedores"
                )
              }
            >
              <span>♙</span>
              Fornecedores
            </button>
          )}

          {hasPermission(
            "view_relatorios"
          ) && (
            <button
              className={
                pagina ===
                "relatorios"
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                navegar(
                  "relatorios"
                )
              }
            >
              <span>▥</span>
              Relatórios
            </button>
          )}

          {isAdmin && (
            <button
              className={
                pagina ===
                "configuracoes"
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                navegar(
                  "configuracoes"
                )
              }
            >
              <span>⚙</span>
              Configurações

              {pendingUsers >
                0 && (
                <span className="nav-badge">
                  {pendingUsers}
                </span>
              )}
            </button>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">
              {(
                perfil.full_name ||
                perfil.username ||
                "U"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {perfil.full_name ||
                  perfil.username}
              </strong>

              <span>
                {getRoleLabel(
                  perfil.role,
                  perfil.is_primary_admin
                )}
              </span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            ↪ Sair
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>
              {pagina ===
                "dashboard" &&
                "Dashboard"}

              {pagina ===
                "lancamentos" &&
                "Lançamentos"}

              {pagina ===
                "medicoes" &&
                "Medições"}

              {pagina ===
                "financeiro" &&
                "Financeiro"}

              {pagina ===
                "fornecedores" &&
                "Fornecedores"}

              {pagina ===
                "relatorios" &&
                "Relatórios"}

              {pagina ===
                "configuracoes" &&
                "Configurações"}
            </h1>

            <p>
              {pagina ===
              "configuracoes"
                ? "Gerencie o sistema e as permissões."
                : "Visão geral do controle administrativo."}
            </p>
          </div>

          <div className="topbar-actions">
            {pagina ===
              "lancamentos" &&
              hasPermission(
                "create_lancamento"
              ) && (
                <button
                  className="primary-button"
                  onClick={
                    abrirNovoLancamento
                  }
                >
                  + Novo lançamento
                </button>
              )}
          </div>
        </header>

        {notice && (
          <div className="notice">
            {notice}
          </div>
        )}

        {pagina ===
          "dashboard" && (
          <section className="page-content">
            <div className="filter-panel">
              <div>
                <label>
                  Período
                </label>

                <select
                  value={periodo}
                  onChange={(e) =>
                    setPeriodo(
                      e.target.value
                    )
                  }
                >
                  <option value="todos">
                    Todos
                  </option>

                  <option value="semana">
                    Esta semana
                  </option>

                  <option value="mes">
                    Este mês
                  </option>
                </select>
              </div>

              <div>
                <label>
                  Tipo
                </label>

                <select
                  value={
                    tipoFiltro
                  }
                  onChange={(e) =>
                    setTipoFiltro(
                      e.target.value
                    )
                  }
                >
                  <option value="todos">
                    Todos
                  </option>

                  {TIPOS_LANCAMENTO.map(
                    (tipo) => (
                      <option
                        key={tipo}
                        value={tipo}
                      >
                        {tipo}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label>
                  Fornecedor
                </label>

                <select
                  value={
                    fornecedorFiltro
                  }
                  onChange={(e) =>
                    setFornecedorFiltro(
                      e.target.value
                    )
                  }
                >
                  <option value="todos">
                    Todos
                  </option>

                  {fornecedores.map(
                    (fornecedor) => (
                      <option
                        key={
                          fornecedor
                        }
                        value={
                          fornecedor
                        }
                      >
                        {fornecedor}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="kpi-grid">
              <div className="kpi-card">
                <span>
                  Total de lançamentos
                </span>

                <strong>
                  {
                    dashboardStats.total
                  }
                </strong>
              </div>

              <div className="kpi-card success">
                <span>
                  Lançados
                </span>

                <strong>
                  {
                    dashboardStats.lancados
                  }
                </strong>
              </div>

              <div className="kpi-card warning">
                <span>
                  Pendentes
                </span>

                <strong>
                  {
                    dashboardStats.pendentes
                  }
                </strong>
              </div>

              <div className="kpi-card money">
                <span>
                  Valor total
                </span>

                <strong>
                  {formatCurrency(
                    dashboardStats.valorTotal
                  )}
                </strong>
              </div>

              <div className="kpi-card">
                <span>
                  Ticket médio
                </span>

                <strong>
                  {formatCurrency(
                    dashboardStats.media
                  )}
                </strong>
              </div>
            </div>

            <div className="dashboard-grid">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>
                      Status dos lançamentos
                    </h2>

                    <span>
                      Período selecionado
                    </span>
                  </div>
                </div>

                <div className="status-overview">
                  <div className="status-circle">
                    {dashboardStats.total
                      ? Math.round(
                          (dashboardStats.lancados /
                            dashboardStats.total) *
                            100
                        )
                      : 0}
                    %
                  </div>

                  <div className="status-list">
                    <div>
                      <span>
                        <i className="dot green" />
                        Lançados
                      </span>

                      <strong>
                        {
                          dashboardStats.lancados
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        <i className="dot yellow" />
                        Pendentes
                      </span>

                      <strong>
                        {
                          dashboardStats.pendentes
                        }
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>
                      Por tipo
                    </h2>

                    <span>
                      Distribuição atual
                    </span>
                  </div>
                </div>

                <div className="movement-list">
                  {TIPOS_LANCAMENTO.map(
                    (tipo) => {
                      const quantidade =
                        filteredLancamentos.filter(
                          (item) =>
                            item.tipo ===
                            tipo
                        ).length;

                      return (
                        <div
                          className="movement-row"
                          key={tipo}
                        >
                          <span
                            style={{
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {tipo}
                          </span>

                          <div className="movement-bar">
                            <i
                              style={{
                                width: `${Math.min(
                                  quantidade *
                                    12,
                                  100
                                )}%`,
                              }}
                            />
                          </div>

                          <strong>
                            {
                              quantidade
                            }
                          </strong>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>
            </div>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>
                    Lançamentos recentes
                  </h2>

                  <span>
                    Dados filtrados
                  </span>
                </div>

                <button
                  className="text-button"
                  onClick={() =>
                    navegar(
                      "lancamentos"
                    )
                  }
                >
                  Ver todos →
                </button>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Emissão
                      </th>
                      <th>
                        Entrada
                      </th>
                      <th>
                        Tipo
                      </th>
                      <th>
                        Fornecedor
                      </th>
                      <th>
                        NF
                      </th>
                      <th>
                        Vencimento
                      </th>
                      <th>
                        Lançar até
                      </th>
                      <th>
                        Valor
                      </th>
                      <th>
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredLancamentos
                      .slice(0, 8)
                      .map(
                        (item) => (
                          <tr
                            key={
                              item.id
                            }
                          >
                            <td>
                              {formatDate(
                                item.dataEmissao
                              )}
                            </td>

                            <td>
                              {formatDate(
                                item.dataEntrada
                              )}
                            </td>

                            <td>
                              {item.tipo}
                            </td>

                            <td>
                              <strong>
                                {
                                  item.fornecedor
                                }
                              </strong>
                            </td>

                            <td>
                              {item.nf}
                            </td>

                            <td>
                              {formatDate(
                                item.vencimento
                              )}
                            </td>

                            <td>
                              {formatDate(
                                item.lancarAte
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                item.valor
                              )}
                            </td>

                            <td>
                              <span
                                className={
                                  item.status ===
                                  "LANÇADO"
                                    ? "status-badge approved"
                                    : "status-badge pending"
                                }
                              >
                                {
                                  item.status
                                }
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {pagina ===
          "lancamentos" && (
          <section className="page-content">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>
                    Lançamentos
                  </h2>

                  <span>
                    {
                      filteredLancamentos.length
                    }{" "}
                    registros
                  </span>
                </div>

                {/* IMPORTANTE:
                    NÃO existe outro botão aqui.
                    O único + Novo lançamento
                    fica no topbar. */}
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Emissão
                      </th>
                      <th>
                        Entrada
                      </th>
                      <th>
                        Tipo
                      </th>
                      <th>
                        Fornecedor
                      </th>
                      <th>
                        CNPJ
                      </th>
                      <th>
                        Nº NF
                      </th>
                      <th>
                        Vencimento
                      </th>
                      <th>
                        Lançar até
                      </th>
                      <th>
                        Valor
                      </th>
                      <th>
                        Lançado
                      </th>
                      <th>
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredLancamentos.map(
                      (item) => {
                        const marcado =
                          item.status ===
                          "LANÇADO";

                        return (
                          <tr
                            key={
                              item.id
                            }
                          >
                            <td>
                              {formatDate(
                                item.dataEmissao
                              )}
                            </td>

                            <td>
                              {formatDate(
                                item.dataEntrada
                              )}
                            </td>

                            <td>
                              <span className="type-badge">
                                {
                                  item.tipo
                                }
                              </span>
                            </td>

                            <td>
                              {
                                item.fornecedor
                              }
                            </td>

                            <td>
                              {item.cnpj ||
                                "-"}
                            </td>

                            <td>
                              {item.nf ||
                                "-"}
                            </td>

                            <td>
                              {formatDate(
                                item.vencimento
                              )}
                            </td>

                            <td>
                              {formatDate(
                                item.lancarAte
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                item.valor
                              )}
                            </td>

                            <td>
                              <input
                                type="checkbox"
                                className="status-check"
                                checked={
                                  marcado
                                }
                                disabled={
                                  !hasPermission(
                                    "edit_lancamento"
                                  ) &&
                                  !hasPermission(
                                    "create_lancamento"
                                  )
                                }
                                onChange={(
                                  e
                                ) =>
                                  alterarStatusLancamento(
                                    item.id,
                                    e
                                      .target
                                      .checked
                                  )
                                }
                              />
                            </td>

                            <td>
                              <span
                                className={
                                  marcado
                                    ? "status-badge approved"
                                    : "status-badge pending"
                                }
                              >
                                {marcado
                                  ? "LANÇADO"
                                  : "PENDENTE"}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {[
          "medicoes",
          "financeiro",
          "fornecedores",
          "relatorios",
        ].includes(
          pagina
        ) && (
          <section className="page-content">
            <section className="empty-page">
              <div className="empty-icon">
                {pagina ===
                  "medicoes" &&
                  "◫"}

                {pagina ===
                  "financeiro" &&
                  "R$"}

                {pagina ===
                  "fornecedores" &&
                  "♙"}

                {pagina ===
                  "relatorios" &&
                  "▥"}
              </div>

              <h2>
                {pagina ===
                  "medicoes" &&
                  "Medições"}

                {pagina ===
                  "financeiro" &&
                  "Financeiro"}

                {pagina ===
                  "fornecedores" &&
                  "Fornecedores"}

                {pagina ===
                  "relatorios" &&
                  "Relatórios"}
              </h2>

              <p>
                Esta área está preparada
                para receber os próximos
                módulos do sistema.
              </p>
            </section>
          </section>
        )}

        {pagina ===
          "configuracoes" &&
          isAdmin && (
            <section className="page-content settings-page">
              <div className="settings-grid">
                <section className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <h2>
                        🎨 Aparência
                      </h2>

                      <p>
                        Personalize a identidade visual do sistema.
                      </p>
                    </div>
                  </div>

                  <div className="settings-form-grid">
                    <div className="field">
                      <label>
                        Nome do sistema
                      </label>

                      <input
                        value={
                          settings.systemName
                        }
                        onChange={(e) =>
                          setSettings(
                            (prev) => ({
                              ...prev,
                              systemName:
                                e
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>

                    <div className="field">
                      <label>
                        Nome da empresa
                      </label>

                      <input
                        value={
                          settings.companyName
                        }
                        onChange={(e) =>
                          setSettings(
                            (prev) => ({
                              ...prev,
                              companyName:
                                e
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>

                    <div className="field">
                      <label>
                        Cor principal
                      </label>

                      <div className="color-input">
                        <input
                          type="color"
                          value={
                            settings.primaryColor
                          }
                          onChange={(e) =>
                            setSettings(
                              (prev) => ({
                                ...prev,
                                primaryColor:
                                  e
                                    .target
                                    .value,
                              })
                            )
                          }
                        />

                        <input
                          value={
                            settings.primaryColor
                          }
                          onChange={(e) =>
                            setSettings(
                              (prev) => ({
                                ...prev,
                                primaryColor:
                                  e
                                    .target
                                    .value,
                              })
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label>
                        Cor secundária
                      </label>

                      <div className="color-input">
                        <input
                          type="color"
                          value={
                            settings.secondaryColor
                          }
                          onChange={(e) =>
                            setSettings(
                              (prev) => ({
                                ...prev,
                                secondaryColor:
                                  e
                                    .target
                                    .value,
                              })
                            )
                          }
                        />

                        <input
                          value={
                            settings.secondaryColor
                          }
                          onChange={(e) =>
                            setSettings(
                              (prev) => ({
                                ...prev,
                                secondaryColor:
                                  e
                                    .target
                                    .value,
                              })
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label>
                        Cor da barra lateral
                      </label>

                      <div className="color-input">
                        <input
                          type="color"
                          value={
                            settings.sidebarColor
                          }
                          onChange={(e) =>
                            setSettings(
                              (prev) => ({
                                ...prev,
                                sidebarColor:
                                  e
                                    .target
                                    .value,
                              })
                            )
                          }
                        />

                        <input
                          value={
                            settings.sidebarColor
                          }
                          onChange={(e) =>
                            setSettings(
                              (prev) => ({
                                ...prev,
                                sidebarColor:
                                  e
                                    .target
                                    .value,
                              })
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label>
                        Logo / imagem
                      </label>

                      <input
                        value={
                          settings.logoUrl
                        }
                        onChange={(e) =>
                          setSettings(
                            (prev) => ({
                              ...prev,
                              logoUrl:
                                e
                                  .target
                                  .value,
                            })
                          )
                        }
                        placeholder="Cole aqui o endereço da imagem"
                      />
                    </div>
                  </div>

                  <label className="switch-row">
                    <input
                      type="checkbox"
                      checked={
                        settings.darkMode
                      }
                      onChange={(e) =>
                        setSettings(
                          (prev) => ({
                            ...prev,
                            darkMode:
                              e.target
                                .checked,
                          })
                        )
                      }
                    />

                    <span>
                      Ativar modo escuro
                    </span>
                  </label>

                  <button
                    className="primary-button"
                    onClick={
                      salvarConfiguracoes
                    }
                  >
                    Salvar aparência
                  </button>

                  {settingsSaved && (
                    <span className="success-message">
                      Configurações salvas.
                    </span>
                  )}
                </section>

                <section className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <h2>
                        👤 Minha conta
                      </h2>

                      <p>
                        Atualize seus dados pessoais.
                      </p>
                    </div>
                  </div>

                  <div className="settings-form-grid">
                    <div className="field">
                      <label>
                        Nome completo
                      </label>

                      <input
                        value={
                          accountForm.fullName
                        }
                        onChange={(e) =>
                          setAccountForm(
                            (prev) => ({
                              ...prev,
                              fullName:
                                e
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>

                    <div className="field">
                      <label>
                        Username
                      </label>

                      <input
                        value={
                          accountForm.username
                        }
                        onChange={(e) =>
                          setAccountForm(
                            (prev) => ({
                              ...prev,
                              username:
                                e
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>
                  </div>

                  <button
                    className="primary-button"
                    onClick={
                      salvarMinhaConta
                    }
                    disabled={
                      accountSaving
                    }
                  >
                    {accountSaving
                      ? "Salvando..."
                      : "Salvar dados"}
                  </button>

                  <div className="divider" />

                  <h3>
                    Alterar e-mail
                  </h3>

                  <div className="field">
                    <label>
                      Novo e-mail
                    </label>

                    <input
                      type="email"
                      value={
                        emailForm
                      }
                      onChange={(e) =>
                        setEmailForm(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <button
                    className="secondary-button"
                    onClick={
                      alterarMeuEmail
                    }
                    disabled={
                      accountSaving
                    }
                  >
                    Alterar e-mail
                  </button>

                  <div className="divider" />

                  <h3>
                    Alterar senha
                  </h3>

                  <div className="settings-form-grid">
                    <div className="field">
                      <label>
                        Nova senha
                      </label>

                      <input
                        type="password"
                        value={
                          passwordForm.password
                        }
                        onChange={(e) =>
                          setPasswordForm(
                            (prev) => ({
                              ...prev,
                              password:
                                e
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>

                    <div className="field">
                      <label>
                        Confirmar senha
                      </label>

                      <input
                        type="password"
                        value={
                          passwordForm.confirmPassword
                        }
                        onChange={(e) =>
                          setPasswordForm(
                            (prev) => ({
                              ...prev,
                              confirmPassword:
                                e
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={
                      alterarMinhaSenha
                    }
                    disabled={
                      passwordSaving
                    }
                  >
                    {passwordSaving
                      ? "Alterando..."
                      : "Alterar senha"}
                  </button>
                </section>
              </div>

              <section className="settings-card users-card">
                <div className="settings-card-header">
                  <div>
                    <h2>
                      👥 Usuários
                    </h2>

                    <p>
                      Controle quem possui acesso ao sistema.
                    </p>
                  </div>

                  <div className="user-summary">
                    <strong>
                      {
                        pendingUsers
                      }
                    </strong>

                    <span>
                      aguardando aprovação
                    </span>
                  </div>
                </div>

                <div className="user-toolbar">
                  {[
                    [
                      "Todos",
                      "Todos",
                    ],
                    [
                      "pending",
                      "Pendentes",
                    ],
                    [
                      "approved",
                      "Aprovados",
                    ],
                    [
                      "blocked",
                      "Bloqueados",
                    ],
                    [
                      "rejected",
                      "Rejeitados",
                    ],
                  ].map(
                    ([value, label]) => (
                      <button
                        key={value}
                        className={
                          userFilter ===
                          value
                            ? "filter-button active"
                            : "filter-button"
                        }
                        onClick={() =>
                          setUserFilter(
                            value
                          )
                        }
                      >
                        {label}
                      </button>
                    )
                  )}

                  <button
                    className="secondary-button"
                    onClick={
                      loadUsers
                    }
                  >
                    ↻ Atualizar
                  </button>
                </div>

                {usersError && (
                  <div className="error-message">
                    {usersError}
                  </div>
                )}

                {userNotice && (
                  <div className="notice">
                    {userNotice}
                  </div>
                )}

                {loadingUsers ? (
                  <div className="loading-box">
                    <div className="loading-spinner" />
                    Carregando usuários...
                  </div>
                ) : (
                  <div className="users-list">
                    {usuariosFiltrados.map(
                      (user) => {
                        const protegido =
                          user.is_primary_admin ||
                          user.id ===
                            session.user.id;

                        return (
                          <div
                            className="user-row"
                            key={
                              user.id
                            }
                          >
                            <div className="user-main">
                              <div className="user-avatar large">
                                {(
                                  user.full_name ||
                                  user.username ||
                                  "U"
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {user.full_name ||
                                    user.username ||
                                    "Usuário"}
                                </strong>

                                <span>
                                  @
                                  {user.username ||
                                    "sem username"}
                                </span>

                                <small>
                                  {getRoleLabel(
                                    user.role,
                                    user.is_primary_admin
                                  )}
                                </small>
                              </div>
                            </div>

                            <div>
                              <span
                                className={`status-badge ${
                                  user.status ===
                                  "approved"
                                    ? "approved"
                                    : user.status ===
                                      "pending"
                                    ? "pending"
                                    : "blocked"
                                }`}
                              >
                                {getStatusLabel(
                                  user.status
                                )}
                              </span>
                            </div>

                            <div className="user-actions">
                              {user.status ===
                                "pending" &&
                                !protegido && (
                                  <button
                                    className="small-button success"
                                    onClick={() =>
                                      alterarStatusRapido(
                                        user,
                                        "approved"
                                      )
                                    }
                                  >
                                    Aprovar
                                  </button>
                                )}

                              {user.status ===
                                "approved" &&
                                !protegido && (
                                  <button
                                    className="small-button danger"
                                    onClick={() =>
                                      alterarStatusRapido(
                                        user,
                                        "blocked"
                                      )
                                    }
                                  >
                                    Bloquear
                                  </button>
                                )}

                              {user.status ===
                                "blocked" &&
                                !protegido && (
                                  <button
                                    className="small-button success"
                                    onClick={() =>
                                      alterarStatusRapido(
                                        user,
                                        "approved"
                                      )
                                    }
                                  >
                                    Reativar
                                  </button>
                                )}

                              {user.status ===
                                "pending" &&
                                !protegido && (
                                  <button
                                    className="small-button danger"
                                    onClick={() =>
                                      alterarStatusRapido(
                                        user,
                                        "rejected"
                                      )
                                    }
                                  >
                                    Rejeitar
                                  </button>
                                )}

                              <button
                                className="small-button"
                                onClick={() =>
                                  abrirEdicaoUsuario(
                                    user
                                  )
                                }
                                disabled={
                                  protegido
                                }
                              >
                                Editar
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )}

                    {usuariosFiltrados.length ===
                      0 && (
                      <div className="empty-users">
                        Nenhum usuário encontrado.
                      </div>
                    )}
                  </div>
                )}
              </section>
            </section>
          )}
      </main>

      {/*
       * MODAL DE NOVO LANÇAMENTO
       *
       * Agora contém todos os campos definidos.
       */}
      {modalLancamento && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>
                  Novo lançamento
                </h2>

                <p>
                  Cadastre uma nova entrada.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setModalLancamento(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                salvarLancamento
              }
            >
              <div className="settings-form-grid">
                <div className="field">
                  <label>
                    Data de emissão *
                  </label>

                  <input
                    type="date"
                    value={
                      novoLancamento.dataEmissao
                    }
                    onChange={(e) =>
                      alterarCampoLancamento(
                        "dataEmissao",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    Data de entrada *
                  </label>

                  <input
                    type="date"
                    value={
                      novoLancamento.dataEntrada
                    }
                    onChange={(e) =>
                      alterarCampoLancamento(
                        "dataEntrada",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    Tipo *
                  </label>

                  <select
                    value={
                      novoLancamento.tipo
                    }
                    onChange={(e) =>
                      alterarCampoLancamento(
                        "tipo",
                        e.target.value
                      )
                    }
                    required
                  >
                    {TIPOS_LANCAMENTO.map(
                      (tipo) => (
                        <option
                          key={tipo}
                          value={tipo}
                        >
                          {tipo}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="field">
                  <label>
                    Fornecedor *
                  </label>

                  <input
                    value={
                      novoLancamento.fornecedor
                    }
                    onChange={(e) =>
                      alterarCampoLancamento(
                        "fornecedor",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    CNPJ *
                  </label>

                  <input
                    value={
                      novoLancamento.cnpj
                    }
                    onChange={(e) =>
                      alterarCampoLancamento(
                        "cnpj",
                        mascaraCNPJ(
                          e.target
                            .value
                        )
                      )
                    }
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    Nº da NF *
                  </label>

                  <input
                    value={
                      novoLancamento.nf
                    }
                    onChange={(e) =>
                      alterarCampoLancamento(
                        "nf",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    Vencimento *
                  </label>

                  <input
                    type="date"
                    value={
                      novoLancamento.vencimento
                    }
                    onChange={(e) =>
                      alterarCampoLancamento(
                        "vencimento",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    Lançar até
                  </label>

                  <input
                    type="date"
                    value={
                      novoLancamento.lancarAte
                    }
                    readOnly
                  />

                  <small>
                    Calculado automaticamente: 15 dias antes do vencimento, voltando para o último dia útil quando necessário.
                  </small>
                </div>

                <div className="field">
                  <label>
                    Valor *
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={
                      novoLancamento.valor
                    }
                    onChange={(e) =>
                      alterarCampoLancamento(
                        "valor",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="field launch-check-field">
                  <label>
                    Status inicial
                  </label>

                  <label className="launch-check">
                    <input
                      type="checkbox"
                      checked={
                        novoLancamento.status ===
                        "LANÇADO"
                      }
                      onChange={(e) =>
                        setNovoLancamento(
                          (prev) => ({
                            ...prev,
                            status:
                              e
                                .target
                                .checked
                                ? "LANÇADO"
                                : "PENDENTE",
                          })
                        )
                      }
                    />

                    <span>
                      Marcar como lançado
                    </span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setModalLancamento(
                      false
                    )
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Salvar lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <div>
                <h2>
                  Editar usuário
                </h2>

                <p>
                  {editingUser.full_name ||
                    editingUser.username}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setEditingUser(null)
                }
              >
                ×
              </button>
            </div>

            <div className="settings-form-grid">
              <div className="field">
                <label>
                  Status
                </label>

                <select
                  value={
                    userForm.status
                  }
                  onChange={(e) =>
                    setUserForm(
                      (prev) => ({
                        ...prev,
                        status:
                          e.target
                            .value,
                      })
                    )
                  }
                >
                  <option value="pending">
                    Aguardando aprovação
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
                  Função
                </label>

                <select
                  value={
                    userForm.role
                  }
                  onChange={(e) =>
                    alterarRoleUsuario(
                      e.target.value
                    )
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
                </select>
              </div>
            </div>

            <div className="permissions-section">
              <div className="permissions-header">
                <h3>
                  Permissões
                </h3>

                <span>
                  Defina exatamente o que este usuário poderá acessar.
                </span>
              </div>

              <div className="permissions-grid">
                {PERMISSION_ITEMS.map(
                  ([key, label]) => (
                    <label
                      className="permission-item"
                      key={key}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(
                          userForm
                            .permissions[
                            key
                          ]
                        )}
                        disabled={
                          userForm.role ===
                          "admin"
                        }
                        onChange={(e) =>
                          setUserForm(
                            (prev) => ({
                              ...prev,
                              permissions:
                                {
                                  ...prev.permissions,
                                  [key]:
                                    e
                                      .target
                                      .checked,
                                },
                            })
                          )
                        }
                      />

                      <span>
                        {label}
                      </span>
                    </label>
                  )
                )}
              </div>

              {userForm.role ===
                "admin" && (
                <div className="info-message">
                  Administradores possuem todas as permissões automaticamente.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={() =>
                  setEditingUser(
                    null
                  )
                }
              >
                Cancelar
              </button>

              <button
                className="primary-button"
                onClick={
                  salvarUsuario
                }
                disabled={
                  savingUser
                }
              >
                {savingUser
                  ? "Salvando..."
                  : "Salvar usuário"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        :root {
          --primary-color: #2563eb;
          --secondary-color: #0f172a;
          --sidebar-color: #111827;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Arial,
            sans-serif;
          background: #f5f7fb;
          color: #172033;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .app-shell {
          display: flex;
          min-height: 100vh;
          background: #f5f7fb;
        }

        .sidebar {
          width: 250px;
          min-height: 100vh;
          background: var(--sidebar-color);
          color: white;
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 10;
        }

        .sidebar-brand {
          padding: 24px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .brand-logo {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          background: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 20px;
          overflow: hidden;
        }

        .brand-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sidebar-brand strong {
          display: block;
          font-size: 16px;
        }

        .sidebar-brand span {
          display: block;
          color: #94a3b8;
          font-size: 11px;
          margin-top: 3px;
        }

        .sidebar-nav {
          padding: 18px 12px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .nav-item {
          border: 0;
          background: transparent;
          color: #cbd5e1;
          padding: 12px 14px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          gap: 11px;
          text-align: left;
          font-size: 14px;
          position: relative;
        }

        .nav-item:hover,
        .nav-item.active {
          background: rgba(255,255,255,.09);
          color: white;
        }

        .nav-item.active {
          box-shadow: inset 3px 0 0 var(--primary-color);
        }

        .nav-badge {
          margin-left: auto;
          min-width: 21px;
          height: 21px;
          padding: 0 6px;
          border-radius: 20px;
          background: #ef4444;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: white;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding: 15px;
          border-top: 1px solid rgba(255,255,255,.08);
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .user-avatar {
          width: 35px;
          height: 35px;
          border-radius: 50%;
          background: var(--primary-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .user-avatar.large {
          width: 44px;
          height: 44px;
        }

        .sidebar-user strong,
        .sidebar-user span {
          display: block;
        }

        .sidebar-user strong {
          font-size: 12px;
        }

        .sidebar-user span {
          color: #94a3b8;
          font-size: 10px;
          margin-top: 3px;
        }

        .logout-button {
          width: 100%;
          border: 0;
          background: rgba(255,255,255,.06);
          color: #cbd5e1;
          padding: 9px;
          border-radius: 8px;
        }

        .main-content {
          margin-left: 250px;
          width: calc(100% - 250px);
          min-height: 100vh;
        }

        .topbar {
          min-height: 92px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 22px 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .topbar h1 {
          margin: 0;
          font-size: 24px;
        }

        .topbar p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .page-content {
          padding: 28px;
        }

        .primary-button,
        .secondary-button,
        .small-button {
          border: 0;
          border-radius: 8px;
          padding: 10px 15px;
          font-weight: 600;
        }

        .primary-button {
          color: white;
          background: var(--primary-color);
        }

        .primary-button:hover {
          filter: brightness(.94);
        }

        .primary-button:disabled,
        .secondary-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .secondary-button {
          color: #334155;
          background: #e2e8f0;
        }

        .secondary-button:hover {
          background: #cbd5e1;
        }

        .filter-panel {
          background: white;
          padding: 18px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          display: flex;
          gap: 18px;
          margin-bottom: 22px;
        }

        .filter-panel > div {
          flex: 1;
        }

        label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 7px;
        }

        input,
        select {
          width: 100%;
          border: 1px solid #dbe1ea;
          background: white;
          border-radius: 8px;
          padding: 10px 11px;
          outline: none;
          color: #172033;
        }

        input:focus,
        select:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(37,99,235,.08);
        }

        input[type="checkbox"] {
          width: 17px;
          height: 17px;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }

        .kpi-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 19px;
          position: relative;
          overflow: hidden;
        }

        .kpi-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--primary-color);
        }

        .kpi-card.success::before {
          background: #16a34a;
        }

        .kpi-card.warning::before {
          background: #f59e0b;
        }

        .kpi-card.money::before {
          background: #7c3aed;
        }

        .kpi-card span {
          color: #64748b;
          font-size: 12px;
        }

        .kpi-card strong {
          display: block;
          margin-top: 8px;
          font-size: 23px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .panel,
        .settings-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
        }

        .panel-header,
        .settings-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .panel-header h2,
        .settings-card h2 {
          margin: 0;
          font-size: 16px;
        }

        .panel-header span,
        .settings-card-header p {
          display: block;
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .status-overview {
          display: flex;
          align-items: center;
          gap: 35px;
          padding: 10px 5px 5px;
        }

        .status-circle {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background:
            conic-gradient(
              var(--primary-color) 0 70%,
              #e2e8f0 70% 100%
            );
          display: flex;
          align-items: center;
          justify-content: center;
          color: #172033;
          font-size: 24px;
          font-weight: 800;
          position: relative;
        }

        .status-circle::after {
          content: "";
          width: 94px;
          height: 94px;
          position: absolute;
          background: white;
          border-radius: 50%;
        }

        .status-circle {
          isolation: isolate;
          z-index: 0;
        }

        .status-circle::after {
          z-index: -1;
        }

        .status-list {
          flex: 1;
        }

        .status-list > div {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #eef2f7;
        }

        .status-list span {
          color: #64748b;
          font-size: 13px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 7px;
        }

        .dot.green {
          background: #16a34a;
        }

        .dot.yellow {
          background: #f59e0b;
        }

        .movement-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .movement-row {
          display: grid;
          grid-template-columns: 110px 1fr 30px;
          gap: 10px;
          align-items: center;
          font-size: 12px;
        }

        .movement-bar {
          height: 7px;
          background: #eef2f7;
          border-radius: 10px;
          overflow: hidden;
        }

        .movement-bar i {
          display: block;
          height: 100%;
          background: var(--primary-color);
          border-radius: 10px;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1150px;
        }

        th {
          text-align: left;
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          padding: 12px;
          background: #f8fafc;
          white-space: nowrap;
        }

        td {
          padding: 13px 12px;
          border-bottom: 1px solid #eef2f7;
          font-size: 12px;
          white-space: nowrap;
        }

        .status-check {
          cursor: pointer;
          accent-color: var(--primary-color);
        }

        .type-badge {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 6px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 10px;
          font-weight: 600;
        }

        .status-badge {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
        }

        .status-badge.approved {
          background: #dcfce7;
          color: #15803d;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #a16207;
        }

        .status-badge.blocked {
          background: #fee2e2;
          color: #b91c1c;
        }

        .text-button {
          border: 0;
          background: transparent;
          color: var(--primary-color);
          font-weight: 600;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .settings-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 18px;
        }

        .field {
          margin-bottom: 5px;
        }

        .field small {
          display: block;
          color: #94a3b8;
          margin-top: 5px;
          font-size: 10px;
          line-height: 1.5;
        }

        .color-input {
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 8px;
        }

        .color-input input[type="color"] {
          padding: 3px;
          height: 40px;
        }

        .switch-row {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 10px 0 18px;
        }

        .switch-row input {
          width: auto;
        }

        .launch-check-field {
          display: flex;
          flex-direction: column;
        }

        .launch-check {
          display: flex;
          align-items: center;
          gap: 9px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px;
          margin: 0;
        }

        .launch-check input {
          width: auto;
        }

        .success-message {
          margin-left: 12px;
          color: #15803d;
          font-size: 12px;
          font-weight: 600;
        }

        .divider {
          border-top: 1px solid #e5e7eb;
          margin: 22px 0;
        }

        .settings-card h3 {
          margin: 0 0 14px;
          font-size: 14px;
        }

        .users-card {
          margin-bottom: 20px;
        }

        .user-summary {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          padding: 10px 15px;
          border-radius: 9px;
          text-align: center;
        }

        .user-summary strong,
        .user-summary span {
          display: block;
        }

        .user-summary strong {
          font-size: 20px;
          color: #c2410c;
        }

        .user-summary span {
          font-size: 10px;
          color: #9a3412;
        }

        .user-toolbar {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .filter-button {
          border: 1px solid #dbe1ea;
          background: white;
          color: #64748b;
          padding: 8px 11px;
          border-radius: 7px;
          font-size: 11px;
        }

        .filter-button.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .users-list {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
        }

        .user-row {
          display: grid;
          grid-template-columns: 1.6fr .8fr 1.5fr;
          gap: 20px;
          align-items: center;
          padding: 14px;
          border-bottom: 1px solid #eef2f7;
        }

        .user-row:last-child {
          border-bottom: 0;
        }

        .user-main {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .user-main strong,
        .user-main span,
        .user-main small {
          display: block;
        }

        .user-main strong {
          font-size: 13px;
        }

        .user-main span {
          color: #64748b;
          font-size: 11px;
          margin-top: 3px;
        }

        .user-main small {
          color: #94a3b8;
          font-size: 10px;
          margin-top: 3px;
        }

        .user-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          flex-wrap: wrap;
        }

        .small-button {
          padding: 7px 9px;
          background: #eef2f7;
          color: #334155;
          font-size: 10px;
        }

        .small-button.success {
          background: #dcfce7;
          color: #15803d;
        }

        .small-button.danger {
          background: #fee2e2;
          color: #b91c1c;
        }

        .small-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .permissions-section {
          margin-top: 18px;
        }

        .permissions-header {
          margin-bottom: 12px;
        }

        .permissions-header h3 {
          margin: 0;
        }

        .permissions-header span {
          color: #64748b;
          font-size: 11px;
        }

        .permissions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          padding: 14px;
          border-radius: 9px;
        }

        .permission-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          padding: 9px;
          margin: 0;
        }

        .permission-item input {
          width: auto;
        }

        .info-message,
        .notice {
          padding: 11px 14px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 16px;
        }

        .error-message {
          padding: 11px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          border-radius: 8px;
          margin-bottom: 15px;
          font-size: 12px;
        }

        .loading-box,
        .empty-users {
          padding: 35px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
        }

        .empty-page {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
        }

        .empty-icon {
          width: 70px;
          height: 70px;
          border-radius: 20px;
          background: #eff6ff;
          color: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 24px;
          margin-bottom: 15px;
        }

        .empty-page h2 {
          margin: 0;
        }

        .empty-page p {
          color: #64748b;
          font-size: 13px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 100;
        }

        .modal {
          width: min(680px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 25px 80px rgba(0,0,0,.25);
        }

        .modal.large {
          width: min(820px, 100%);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 22px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 19px;
        }

        .modal-header p {
          color: #64748b;
          font-size: 12px;
          margin: 5px 0 0;
        }

        .modal-close {
          border: 0;
          background: #f1f5f9;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          font-size: 20px;
          color: #475569;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 25px;
          padding-top: 18px;
          border-top: 1px solid #e5e7eb;
        }

        .auth-loading,
        .account-status-screen {
          min-height: 100vh;
          background: #f5f7fb;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
          color: #475569;
        }

        .account-status-card {
          width: min(450px, calc(100% - 30px));
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(15,23,42,.08);
          filter: grayscale(1);
        }

        .account-status-card h1 {
          margin: 15px 0 8px;
          color: #1e293b;
        }

        .account-status-card p {
          color: #64748b;
          line-height: 1.6;
          font-size: 13px;
        }

        .account-status-card strong {
          display: block;
          margin: 18px 0 5px;
        }

        .account-status-card span {
          display: block;
          color: #94a3b8;
          font-size: 11px;
          margin-bottom: 22px;
        }

        .account-status-icon {
          width: 65px;
          height: 65px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin: auto;
        }

        .loading-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #dbeafe;
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .controle-dark body {
          background: #0f172a;
        }

        .controle-dark .main-content,
        .controle-dark .page-content,
        .controle-dark .app-shell {
          background: #0f172a;
        }

        .controle-dark .topbar,
        .controle-dark .panel,
        .controle-dark .settings-card,
        .controle-dark .kpi-card,
        .controle-dark .filter-panel,
        .controle-dark .empty-page,
        .controle-dark input,
        .controle-dark select {
          background: #172033;
          color: #e2e8f0;
          border-color: #273449;
        }

        .controle-dark .topbar p,
        .controle-dark .panel-header span,
        .controle-dark .settings-card-header p,
        .controle-dark .kpi-card span {
          color: #94a3b8;
        }

        @media (max-width: 1200px) {
          .kpi-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 1100px) {
          .settings-grid,
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 800px) {
          .sidebar {
            width: 210px;
          }

          .main-content {
            margin-left: 210px;
            width: calc(100% - 210px);
          }

          .page-content {
            padding: 18px;
          }

          .filter-panel {
            flex-direction: column;
          }

          .user-row {
            grid-template-columns: 1fr;
          }

          .user-actions {
            justify-content: flex-start;
          }

          .settings-form-grid {
            grid-template-columns: 1fr;
          }

          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .sidebar {
            display: none;
          }

          .main-content {
            margin-left: 0;
            width: 100%;
          }

          .topbar {
            padding: 18px;
          }

          .topbar h1 {
            font-size: 20px;
          }

          .kpi-grid {
            grid-template-columns: 1fr;
          }

          .settings-form-grid,
          .permissions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}