import { useEffect, useState } from "react";

const FORNECEDOR_INICIAL = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  inscricao_estadual: "",
  tipo_fornecedor: "",
  email: "",
  telefone: "",
  celular: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  banco: "",
  agencia: "",
  conta: "",
  pix: "",
  observacoes: "",
  status: "ativo",
};

export default function Fornecedores({
  supabase,
  session,
  hasPermission,
}) {
  const [fornecedores, setFornecedores] =
    useState([]);

  const [busca, setBusca] = useState("");

  const [modalAberto, setModalAberto] =
    useState(false);

  const [fornecedor, setFornecedor] =
    useState(FORNECEDOR_INICIAL);

  const [editandoId, setEditandoId] =
    useState(null);

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] = useState("");

  async function carregarFornecedores() {
    try {
      setCarregando(true);
      setErro("");

      const { data, error } =
        await supabase
          .from("suppliers")
          .select("*")
          .order("razao_social", {
            ascending: true,
          });

      if (error) {
        throw error;
      }

      setFornecedores(data || []);
    } catch (error) {
      console.error(
        "Erro ao carregar fornecedores:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível carregar os fornecedores."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarFornecedores();
  }, []);

  function abrirNovo() {
    setFornecedor({
      ...FORNECEDOR_INICIAL,
    });

    setEditandoId(null);
    setErro("");
    setModalAberto(true);
  }

  function abrirEdicao(item) {
    setFornecedor({
      ...FORNECEDOR_INICIAL,
      ...item,
    });

    setEditandoId(item.id);
    setErro("");
    setModalAberto(true);
  }

  function alterarCampo(campo, valor) {
    setFornecedor((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  async function salvar() {
    try {
      setErro("");

      if (!fornecedor.razao_social.trim()) {
        setErro(
          "Informe a razão social do fornecedor."
        );
        return;
      }

      setSalvando(true);

      const dados = {
        ...fornecedor,

        razao_social:
          fornecedor.razao_social.trim(),

        nome_fantasia:
          fornecedor.nome_fantasia.trim(),

        cnpj:
          fornecedor.cnpj.trim(),

        email:
          fornecedor.email.trim(),

        created_by:
          session?.user?.id,
      };

      let resultado;

      if (editandoId) {
        resultado = await supabase
          .from("suppliers")
          .update(dados)
          .eq("id", editandoId);
      } else {
        resultado = await supabase
          .from("suppliers")
          .insert(dados);
      }

      if (resultado.error) {
        throw resultado.error;
      }

      setModalAberto(false);

      setFornecedor({
        ...FORNECEDOR_INICIAL,
      });

      setEditandoId(null);

      await carregarFornecedores();
    } catch (error) {
      console.error(
        "Erro ao salvar fornecedor:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível salvar o fornecedor."
      );
    } finally {
      setSalvando(false);
    }
  }

  const fornecedoresFiltrados =
    fornecedores.filter((item) => {
      const texto =
        `${item.razao_social || ""} ${
          item.nome_fantasia || ""
        } ${item.cnpj || ""}`.toLowerCase();

      return texto.includes(
        busca.toLowerCase()
      );
    });

  const podeEditar =
    hasPermission("edit_fornecedores");

  return (
    <section className="page-content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Fornecedores
            </h2>

            <span>
              Cadastro e controle dos fornecedores da empresa.
            </span>
          </div>

          {podeEditar && (
            <button
              className="primary-button"
              onClick={abrirNovo}
            >
              + Novo fornecedor
            </button>
          )}
        </div>

        <div
          className="filter-panel"
          style={{
            marginBottom: "18px",
          }}
        >
          <div>
            <label>
              Pesquisar
            </label>

            <input
              value={busca}
              onChange={(e) =>
                setBusca(e.target.value)
              }
              placeholder="Fornecedor, CNPJ..."
            />
          </div>
        </div>

        {erro && !modalAberto && (
          <div className="error-message">
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="loading-box">
            <div className="loading-spinner" />

            Carregando fornecedores...
          </div>
        ) : fornecedoresFiltrados.length ===
          0 ? (
          <div className="empty-users">
            Nenhum fornecedor encontrado.
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>
                    Razão social
                  </th>

                  <th>
                    Nome fantasia
                  </th>

                  <th>
                    CNPJ
                  </th>

                  <th>
                    Cidade
                  </th>

                  <th>
                    Tipo
                  </th>

                  <th>
                    Status
                  </th>

                  {podeEditar && (
                    <th>
                      Ações
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {fornecedoresFiltrados.map(
                  (item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          {
                            item.razao_social
                          }
                        </strong>
                      </td>

                      <td>
                        {item.nome_fantasia ||
                          "—"}
                      </td>

                      <td>
                        {item.cnpj || "—"}
                      </td>

                      <td>
                        {item.cidade
                          ? `${item.cidade}${
                              item.estado
                                ? ` - ${item.estado}`
                                : ""
                            }`
                          : "—"}
                      </td>

                      <td>
                        {item.tipo_fornecedor ||
                          "—"}
                      </td>

                      <td>
                        <span
                          className={
                            item.status ===
                            "ativo"
                              ? "status-badge approved"
                              : "status-badge blocked"
                          }
                        >
                          {item.status ===
                          "ativo"
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </td>

                      {podeEditar && (
                        <td>
                          <button
                            className="small-button"
                            onClick={() =>
                              abrirEdicao(
                                item
                              )
                            }
                          >
                            Editar
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalAberto && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setModalAberto(false);
            }
          }}
        >
          <div className="modal large">
            <div className="modal-header">
              <div>
                <h2>
                  {editandoId
                    ? "Editar fornecedor"
                    : "Novo fornecedor"}
                </h2>

                <p>
                  Preencha os dados do fornecedor.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setModalAberto(false)
                }
              >
                ×
              </button>
            </div>

            <div>
              <h3>
                Dados principais
              </h3>

              <div className="settings-form-grid">
                <div className="field">
                  <label>
                    Razão social *
                  </label>

                  <input
                    value={
                      fornecedor.razao_social
                    }
                    onChange={(e) =>
                      alterarCampo(
                        "razao_social",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label>
                    Nome fantasia
                  </label>

                  <input
                    value={
                      fornecedor.nome_fantasia
                    }
                    onChange={(e) =>
                      alterarCampo(
                        "nome_fantasia",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label>
                    CNPJ
                  </label>

                  <input
                    value={
                      fornecedor.cnpj
                    }
                    onChange={(e) =>
                      alterarCampo(
                        "cnpj",
                        e.target.value
                      )
                    }
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="field">
                  <label>
                    Inscrição estadual
                  </label>

                  <input
                    value={
                      fornecedor.inscricao_estadual
                    }
                    onChange={(e) =>
                      alterarCampo(
                        "inscricao_estadual",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label>
                    Tipo de fornecedor
                  </label>

                  <select
                    value={
                      fornecedor.tipo_fornecedor
                    }
                    onChange={(e) =>
                      alterarCampo(
                        "tipo_fornecedor",
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Selecione
                    </option>

                    <option value="Material">
                      Material
                    </option>

                    <option value="Serviço">
                      Serviço
                    </option>

                    <option value="Locação">
                      Locação
                    </option>

                    <option value="Combustível">
                      Combustível
                    </option>

                    <option value="Consumo">
                      Consumo
                    </option>

                    <option value="Outro">
                      Outro
                    </option>
                  </select>
                </div>

                <div className="field">
                  <label>
                    Status
                  </label>

                  <select
                    value={
                      fornecedor.status
                    }
                    onChange={(e) =>
                      alterarCampo(
                        "status",
                        e.target.value
                      )
                    }
                  >
                    <option value="ativo">
                      Ativo
                    </option>

                    <option value="inativo">
                      Inativo
                    </option>
                  </select>
                </div>
              </div>

              <h3>
                Contato
              </h3>

              <div className="settings-form-grid">
                <div className="field">
                  <label>
                    E-mail
                  </label>

                  <input
                    type="email"
                    value={
                      fornecedor.email
                    }
                    onChange={(e) =>
                      alterarCampo(
                        "email",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label>
                    Telefone
                  </label>

                  <input
                    value={
                      fornecedor.telefone
                    }
                    onChange={(e) =>
                      alterarCampo(
                        "telefone",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label>
                    Celular
                  </label>

                  <input
                    value={
                      fornecedor.celular
                    }
                    onChange={(e) =>
                      alterarCampo(
                        "celular",
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>

              <h3>
                Endereço
              </h3>

              <div className="settings-form-grid">
                {[
                  ["cep", "CEP"],
                  [
                    "endereco",
                    "Endereço",
                  ],
                  ["numero", "Número"],
                  [
                    "complemento",
                    "Complemento",
                  ],
                  ["bairro", "Bairro"],
                  ["cidade", "Cidade"],
                ].map(
                  ([campo, label]) => (
                    <div
                      className="field"
                      key={campo}
                    >
                      <label>
                        {label}
                      </label>

                      <input
                        value={
                          fornecedor[
                            campo
                          ] || ""
                        }
                        onChange={(e) =>
                          alterarCampo(
                            campo,
                            e.target
                              .value
                          )
                        }
                      />
                    </div>
                  )
                )}

                <div className="field">
                  <label>
                    Estado
                  </label>

                  <input
                    value={
                      fornecedor.estado
                    }
                    onChange={(e) =>
                      alterarCampo(
                        "estado",
                        e.target.value
                          .toUpperCase()
                      )
                    }
                    maxLength={2}
                  />
                </div>
              </div>

              <h3>
                Dados bancários
              </h3>

              <div className="settings-form-grid">
                {[
                  ["banco", "Banco"],
                  [
                    "agencia",
                    "Agência",
                  ],
                  ["conta", "Conta"],
                  ["pix", "Pix"],
                ].map(
                  ([campo, label]) => (
                    <div
                      className="field"
                      key={campo}
                    >
                      <label>
                        {label}
                      </label>

                      <input
                        value={
                          fornecedor[
                            campo
                          ] || ""
                        }
                        onChange={(e) =>
                          alterarCampo(
                            campo,
                            e.target
                              .value
                          )
                        }
                      />
                    </div>
                  )
                )}
              </div>

              <h3>
                Observações
              </h3>

              <div className="field">
                <textarea
                  rows="4"
                  value={
                    fornecedor.observacoes
                  }
                  onChange={(e) =>
                    alterarCampo(
                      "observacoes",
                      e.target.value
                    )
                  }
                />
              </div>

              {erro && (
                <div className="error-message">
                  {erro}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={() =>
                  setModalAberto(false)
                }
              >
                Cancelar
              </button>

              <button
                className="primary-button"
                onClick={salvar}
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : "Salvar fornecedor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}