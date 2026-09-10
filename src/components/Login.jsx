import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function limparMensagens() {
    setError("");
    setMessage("");
  }

  function trocarModo(novoModo) {
    limparMensagens();
    setMode(novoModo);
  }

  // =========================================================
  // LOGIN
  // Aceita E-MAIL ou USERNAME
  // =========================================================

  async function handleLogin(e) {
    e.preventDefault();

    limparMensagens();

    const valorLogin = login.trim();

    if (!valorLogin || !password) {
      setError("Informe seu usuário/e-mail e sua senha.");
      return;
    }

    setLoading(true);

    let emailParaLogin = valorLogin;

    const pareceEmail = valorLogin.includes("@");

    // =======================================================
    // LOGIN POR USERNAME
    // =======================================================

    if (!pareceEmail) {
      const { data, error: usernameError } =
        await supabase.rpc("get_login_email_by_username", {
          p_username: valorLogin,
        });

      if (usernameError) {
        console.error(
          "Erro ao consultar username:",
          usernameError
        );

        setLoading(false);
        setError(
          "Não foi possível localizar esse usuário. Tente novamente."
        );

        return;
      }

      if (!data) {
        setLoading(false);
        setError("Usuário/e-mail ou senha incorretos.");
        return;
      }

      emailParaLogin = data;
    }

    // =======================================================
    // LOGIN NO SUPABASE AUTH
    // =======================================================

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: emailParaLogin,
        password,
      });

    setLoading(false);

    if (loginError) {
      console.error("Erro no login:", loginError);

      const mensagemErro =
        loginError.message?.toLowerCase() || "";

      if (mensagemErro.includes("email not confirmed")) {
        setError(
          "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou spam."
        );

        return;
      }

      setError("Usuário/e-mail ou senha incorretos.");
      return;
    }

    onLogin(data.user);
  }

  // =========================================================
  // CADASTRO
  // =========================================================

  async function handleSignup(e) {
    e.preventDefault();

    limparMensagens();

    const emailNormalizado = email.trim().toLowerCase();
    const usernameNormalizado = username.trim().toLowerCase();
    const nomeNormalizado = fullName.trim();

    if (
      !emailNormalizado ||
      !usernameNormalizado ||
      !password
    ) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (usernameNormalizado.length < 3) {
      setError(
        "O nome de usuário precisa ter pelo menos 3 caracteres."
      );
      return;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(usernameNormalizado)) {
      setError(
        "O usuário pode conter apenas letras, números, ponto, hífen e underline."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "A senha precisa ter pelo menos 6 caracteres."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    // =======================================================
    // VERIFICA SE O USERNAME JÁ EXISTE
    // =======================================================

    const {
      data: usernameExistente,
      error: usernameCheckError,
    } = await supabase.rpc("get_login_email_by_username", {
      p_username: usernameNormalizado,
    });

    if (usernameCheckError) {
      console.error(
        "Erro ao verificar username:",
        usernameCheckError
      );

      setLoading(false);

      setError(
        "Não foi possível verificar o nome de usuário. Tente novamente."
      );

      return;
    }

    if (usernameExistente) {
      setLoading(false);

      setError(
        "Esse nome de usuário já está sendo utilizado. Escolha outro."
      );

      return;
    }

    // =======================================================
    // CRIA A CONTA
    // =======================================================

    const { data, error } = await supabase.auth.signUp({
      email: emailNormalizado,
      password,
      options: {
        data: {
          username: usernameNormalizado,
          full_name: nomeNormalizado,
        },
      },
    });

    setLoading(false);

    if (error) {
      console.error("Erro ao criar conta:", error);

      const mensagem =
        error.message?.toLowerCase() || "";

      if (
        mensagem.includes("already registered") ||
        mensagem.includes("already exists") ||
        mensagem.includes("user already registered")
      ) {
        setError(
          "Este e-mail já possui uma conta. Tente entrar ou use outro e-mail."
        );

        return;
      }

      if (
        mensagem.includes("duplicate") ||
        mensagem.includes("unique")
      ) {
        setError(
          "Esse nome de usuário já está sendo utilizado. Escolha outro."
        );

        return;
      }

      setError(error.message);
      return;
    }

    // =======================================================
    // CONFIRMAÇÃO DE E-MAIL
    // =======================================================

    if (!data.session) {
      setMessage(
        "Conta criada com sucesso! Verifique seu e-mail para confirmar a conta. Depois disso, você poderá entrar e aguardará a aprovação do administrador."
      );
    } else {
      setMessage(
        "Conta criada! Seu acesso ficará aguardando aprovação do administrador."
      );
    }

    setEmail("");
    setUsername("");
    setFullName("");
    setPassword("");
    setConfirmPassword("");
  }

  // =========================================================
  // RECUPERAÇÃO DE SENHA
  // =========================================================

  async function handleForgotPassword(e) {
    e.preventDefault();

    limparMensagens();

    const emailNormalizado = email.trim().toLowerCase();

    if (!emailNormalizado) {
      setError("Digite seu e-mail primeiro.");
      return;
    }

    setLoading(true);

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        emailNormalizado,
        {
          redirectTo: window.location.origin,
        }
      );

    setLoading(false);

    if (error) {
      console.error(
        "Erro ao solicitar recuperação:",
        error
      );

      setError(error.message);
      return;
    }

    setMessage(
      "Enviamos um link seguro de recuperação para seu e-mail. Verifique também a caixa de spam."
    );
  }

  // =========================================================
  // ESTILOS
  // =========================================================

  const containerStyle = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e0e7ff 100%)",
    padding: "24px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "430px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "38px",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
    border: "1px solid #e5e7eb",
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "7px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
  };

  const fieldStyle = {
    marginBottom: "16px",
  };

  const buttonStyle = {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>

        {/* =====================================================
            CABEÇALHO
        ====================================================== */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              margin: "0 auto 14px",
              borderRadius: "14px",
              background: "#2563eb",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              fontWeight: "800",
            }}
          >
            C
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "25px",
              color: "#111827",
            }}
          >
            Controle
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Gestão administrativa
          </p>
        </div>

        {/* =====================================================
            LOGIN
        ====================================================== */}

        {mode === "login" && (
          <form onSubmit={handleLogin}>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Usuário ou e-mail
              </label>

              <input
                type="text"
                value={login}
                onChange={(e) =>
                  setLogin(e.target.value)
                }
                placeholder="Seu usuário ou e-mail"
                style={inputStyle}
                autoComplete="username"
                required
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Senha
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Digite sua senha"
                style={inputStyle}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "11px 12px",
                  borderRadius: "9px",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "11px 12px",
                  borderRadius: "9px",
                  background: "#ecfdf5",
                  color: "#047857",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              style={buttonStyle}
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                fontSize: "13px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  trocarModo("signup")
                }
                style={{
                  border: "none",
                  background: "none",
                  color: "#2563eb",
                  cursor: "pointer",
                  padding: 0,
                  fontWeight: "600",
                }}
              >
                Criar uma conta
              </button>

              <button
                type="button"
                onClick={() =>
                  trocarModo("forgot")
                }
                style={{
                  border: "none",
                  background: "none",
                  color: "#6b7280",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Esqueci minha senha
              </button>
            </div>

          </form>
        )}

        {/* =====================================================
            CADASTRO
        ====================================================== */}

        {mode === "signup" && (
          <form onSubmit={handleSignup}>

            <h2
              style={{
                margin: "0 0 6px",
                fontSize: "20px",
                color: "#111827",
              }}
            >
              Criar conta
            </h2>

            <p
              style={{
                margin: "0 0 22px",
                color: "#6b7280",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              Após o cadastro, seu acesso ficará
              aguardando aprovação do administrador.
            </p>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Nome completo
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                placeholder="Seu nome completo"
                style={inputStyle}
                autoComplete="name"
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Nome de usuário
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                placeholder="Ex.: victor"
                style={inputStyle}
                autoComplete="username"
                required
              />

              <div
                style={{
                  marginTop: "6px",
                  fontSize: "11px",
                  color: "#6b7280",
                }}
              >
                Use letras, números, ponto, hífen ou
                underline.
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                E-mail
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="seu@email.com"
                style={inputStyle}
                autoComplete="email"
                required
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Senha
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Mínimo de 6 caracteres"
                style={inputStyle}
                autoComplete="new-password"
                required
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Confirmar senha
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Digite a senha novamente"
                style={inputStyle}
                autoComplete="new-password"
                required
              />
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "11px 12px",
                  borderRadius: "9px",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "11px 12px",
                  borderRadius: "9px",
                  background: "#ecfdf5",
                  color: "#047857",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              style={buttonStyle}
              disabled={loading}
            >
              {loading
                ? "Criando conta..."
                : "Criar conta"}
            </button>

            <button
              type="button"
              onClick={() =>
                trocarModo("login")
              }
              style={{
                width: "100%",
                marginTop: "14px",
                padding: "11px",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                background: "#fff",
                color: "#374151",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Voltar para o login
            </button>

          </form>
        )}

        {/* =====================================================
            RECUPERAÇÃO DE SENHA
        ====================================================== */}

        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword}>

            <h2
              style={{
                margin: "0 0 6px",
                fontSize: "20px",
                color: "#111827",
              }}
            >
              Recuperar senha
            </h2>

            <p
              style={{
                margin: "0 0 22px",
                color: "#6b7280",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              Informe seu e-mail e enviaremos um link
              seguro para redefinir sua senha.
            </p>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                E-mail
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="seu@email.com"
                style={inputStyle}
                autoComplete="email"
                required
              />
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "11px 12px",
                  borderRadius: "9px",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "11px 12px",
                  borderRadius: "9px",
                  background: "#ecfdf5",
                  color: "#047857",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              style={buttonStyle}
              disabled={loading}
            >
              {loading
                ? "Enviando..."
                : "Enviar recuperação"}
            </button>

            <button
              type="button"
              onClick={() =>
                trocarModo("login")
              }
              style={{
                width: "100%",
                marginTop: "14px",
                padding: "11px",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                background: "#fff",
                color: "#374151",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Voltar para o login
            </button>

          </form>
        )}

      </div>
    </div>
  );
}