import { useEffect, useState } from "react";

export default function MinhaConta({
  supabase,
  session,
  perfil,
  setPerfil,
}) {
  const [nome, setNome] = useState(
    perfil?.full_name || ""
  );

  const [usuario, setUsuario] = useState(
    perfil?.username || ""
  );

  const [email, setEmail] = useState(
    session?.user?.email || ""
  );

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const [mensagem, setMensagem] = useState("");
  const [mensagemSenha, setMensagemSenha] = useState("");

  useEffect(() => {
    setNome(perfil?.full_name || "");
    setUsuario(perfil?.username || "");
    setEmail(session?.user?.email || "");
  }, [perfil, session]);

  async function salvarDados() {
    try {
      setSalvando(true);
      setMensagem("");

      const usernameNormalizado = usuario
        .trim()
        .toLowerCase();

      if (!nome.trim()) {
        setMensagem(
          "Informe seu nome completo."
        );
        return;
      }

      if (!usernameNormalizado) {
        setMensagem(
          "Informe um nome de usuário."
        );
        return;
      }

      if (
        !/^[a-zA-Z0-9._-]+$/.test(
          usernameNormalizado
        )
      ) {
        setMensagem(
          "O usuário pode conter apenas letras, números, ponto, hífen e underline."
        );
        return;
      }

      const { data, error } =
        await supabase.rpc(
          "update_my_profile",
          {
            p_full_name: nome.trim(),
            p_username: usernameNormalizado,
          }
        );

      if (error) {
        throw error;
      }

      if (data) {
        setPerfil(data);
      }

      const emailNormalizado = email
        .trim()
        .toLowerCase();

      const emailAtual =
        session?.user?.email
          ?.trim()
          .toLowerCase();

      if (
        emailNormalizado &&
        emailNormalizado !== emailAtual
      ) {
        const { error: emailError } =
          await supabase.auth.updateUser({
            email: emailNormalizado,
          });

        if (emailError) {
          throw emailError;
        }

        setMensagem(
          "Dados atualizados. Verifique o novo e-mail para confirmar a alteração."
        );
      } else {
        setMensagem(
          "Dados atualizados com sucesso."
        );
      }
    } catch (error) {
      console.error(
        "Erro ao atualizar conta:",
        error
      );

      setMensagem(
        error?.message ||
          "Não foi possível atualizar seus dados."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function alterarSenha() {
    try {
      setMensagemSenha("");

      if (novaSenha.length < 6) {
        setMensagemSenha(
          "A senha precisa ter pelo menos 6 caracteres."
        );
        return;
      }

      if (novaSenha !== confirmarSenha) {
        setMensagemSenha(
          "As senhas não coincidem."
        );
        return;
      }

      setSalvandoSenha(true);

      const { error } =
        await supabase.auth.updateUser({
          password: novaSenha,
        });

      if (error) {
        throw error;
      }

      setNovaSenha("");
      setConfirmarSenha("");

      setMensagemSenha(
        "Senha alterada com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao alterar senha:",
        error
      );

      setMensagemSenha(
        error?.message ||
          "Não foi possível alterar a senha."
      );
    } finally {
      setSalvandoSenha(false);
    }
  }

  return (
    <div className="settings-grid">
      <section className="settings-card">
        <div className="settings-card-header">
          <div>
            <h2>👤 Minha conta</h2>

            <p>
              Atualize seus dados pessoais e de acesso.
            </p>
          </div>
        </div>

        <div className="settings-form-grid">
          <div className="field">
            <label>
              Nome completo
            </label>

            <input
              value={nome}
              onChange={(e) =>
                setNome(e.target.value)
              }
              placeholder="Seu nome completo"
            />
          </div>

          <div className="field">
            <label>
              Nome de usuário
            </label>

            <input
              value={usuario}
              onChange={(e) =>
                setUsuario(e.target.value)
              }
              placeholder="usuario"
            />
          </div>

          <div
            className="field"
            style={{
              gridColumn: "1 / -1",
            }}
          >
            <label>
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="seu@email.com"
            />
          </div>
        </div>

        {mensagem && (
          <div className="notice">
            {mensagem}
          </div>
        )}

        <button
          className="primary-button"
          onClick={salvarDados}
          disabled={salvando}
        >
          {salvando
            ? "Salvando..."
            : "Salvar alterações"}
        </button>
      </section>

      <section className="settings-card">
        <div className="settings-card-header">
          <div>
            <h2>🔐 Segurança</h2>

            <p>
              Altere sua senha de acesso.
            </p>
          </div>
        </div>

        <div className="settings-form-grid">
          <div
            className="field"
            style={{
              gridColumn: "1 / -1",
            }}
          >
            <label>
              Nova senha
            </label>

            <input
              type="password"
              value={novaSenha}
              onChange={(e) =>
                setNovaSenha(e.target.value)
              }
              placeholder="Mínimo de 6 caracteres"
            />
          </div>

          <div
            className="field"
            style={{
              gridColumn: "1 / -1",
            }}
          >
            <label>
              Confirmar nova senha
            </label>

            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) =>
                setConfirmarSenha(
                  e.target.value
                )
              }
              placeholder="Digite novamente"
            />
          </div>
        </div>

        {mensagemSenha && (
          <div className="notice">
            {mensagemSenha}
          </div>
        )}

        <button
          className="secondary-button"
          onClick={alterarSenha}
          disabled={salvandoSenha}
        >
          {salvandoSenha
            ? "Alterando..."
            : "Alterar senha"}
        </button>
      </section>
    </div>
  );
}