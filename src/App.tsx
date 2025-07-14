import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "SUA_SUPABASE_URL";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "SUA_SUPABASE_ANON_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Vendedor {
  id: string;
  nome: string;
  email: string;
  status_integracao?: string;
}

const PAGE_SIZE = 10;

export default function App() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [linkGerado, setLinkGerado] = useState<{ [id: string]: string }>({});
  const [copiado, setCopiado] = useState<{ [id: string]: boolean }>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Vendedor>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    buscarVendedores();
    // eslint-disable-next-line
  }, [busca, pagina]);

  async function buscarVendedores() {
    setLoading(true);
    let query = supabase.from("vendedores").select("id, nome, email, status_integracao", { count: "exact" });
    if (busca) {
      query = query.ilike("nome", `%${busca}%`);
    }
    const from = (pagina - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count, error } = await query.range(from, to);
    if (!error && data) {
      setVendedores(data);
      setTotal(count || 0);
    }
    setLoading(false);
  }

  function gerarLink(vendedor: Vendedor) {
    return `https://www.mercadopago.com.br/authorization?user_id=${vendedor.id}`;
  }

  function handleGerarLink(vendedor: Vendedor) {
    const link = gerarLink(vendedor);
    setLinkGerado((prev) => ({ ...prev, [vendedor.id]: link }));
    setCopiado((prev) => ({ ...prev, [vendedor.id]: false }));
  }

  async function handleCopiarLink(id: string) {
    if (linkGerado[id]) {
      await navigator.clipboard.writeText(linkGerado[id]);
      setCopiado((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => setCopiado((prev) => ({ ...prev, [id]: false })), 2000);
    }
  }

  function abrirFormAdicionar() {
    setForm({ nome: "", email: "", status_integracao: "" });
    setEditId(null);
    setShowForm(true);
  }

  function abrirFormEditar(v: Vendedor) {
    setForm({ nome: v.nome, email: v.email, status_integracao: v.status_integracao });
    setEditId(v.id);
    setShowForm(true);
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    if (!form.nome || !form.email) {
      setFormLoading(false);
      return;
    }
    if (editId) {
      // Editar
      const { error } = await supabase.from("vendedores").update({
        nome: form.nome,
        email: form.email,
        status_integracao: form.status_integracao || null,
      }).eq("id", editId);
      if (!error) {
        setShowForm(false);
        buscarVendedores();
      }
    } else {
      // Adicionar
      const { error } = await supabase.from("vendedores").insert({
        nome: form.nome,
        email: form.email,
        status_integracao: form.status_integracao || null,
      });
      if (!error) {
        setShowForm(false);
        setPagina(1);
        buscarVendedores();
      }
    }
    setFormLoading(false);
  }

  function handleCancelarForm() {
    setShowForm(false);
    setEditId(null);
    setForm({});
  }

  function confirmarRemover(id: string) {
    setDeleteId(id);
  }

  async function handleRemover() {
    if (!deleteId) return;
    setDeleteLoading(true);
    const { error } = await supabase.from("vendedores").delete().eq("id", deleteId);
    if (!error) {
      setDeleteId(null);
      buscarVendedores();
    }
    setDeleteLoading(false);
  }

  const totalPaginas = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-6 mt-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">Painel de Vendedores</h1>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <input
            type="text"
            placeholder="Buscar por nome..."
            className="border rounded-lg px-4 py-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
          <span className="text-gray-500 text-sm">Total: {total}</span>
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow text-sm"
            onClick={abrirFormAdicionar}
          >
            + Novo Vendedor
          </button>
        </div>
        {/* Formulário de adicionar/editar */}
        {showForm && (
          <form onSubmit={handleSalvar} className="bg-gray-100 rounded-lg p-4 mb-6 flex flex-col gap-3 shadow-inner">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Nome"
                className="border rounded px-3 py-2 w-full"
                value={form.nome || ""}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                required
              />
              <input
                type="email"
                placeholder="E-mail"
                className="border rounded px-3 py-2 w-full"
                value={form.email || ""}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
              <select
                className="border rounded px-3 py-2 w-full"
                value={form.status_integracao || ""}
                onChange={e => setForm(f => ({ ...f, status_integracao: e.target.value }))}
              >
                <option value="">Status</option>
                <option value="ativo">Ativo</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold"
                onClick={handleCancelarForm}
                disabled={formLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={formLoading}
              >
                {editId ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </form>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-blue-100">
                <th className="px-4 py-2 text-left font-semibold">Nome</th>
                <th className="px-4 py-2 text-left font-semibold">E-mail</th>
                <th className="px-4 py-2 text-left font-semibold">Status</th>
                <th className="px-4 py-2 text-center font-semibold">Link Mercado Pago</th>
                <th className="px-4 py-2 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-blue-500">Carregando...</td>
                </tr>
              ) : vendedores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">Nenhum vendedor encontrado.</td>
                </tr>
              ) : (
                vendedores.map((v) => (
                  <tr key={v.id} className="hover:bg-blue-50 transition">
                    <td className="px-4 py-2 font-medium">{v.nome}</td>
                    <td className="px-4 py-2">{v.email}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${v.status_integracao === "ativo" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                        {v.status_integracao || "Pendente"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center flex flex-col sm:flex-row gap-2 justify-center items-center">
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-semibold shadow"
                        onClick={() => handleGerarLink(v)}
                      >
                        Gerar link
                      </button>
                      {linkGerado[v.id] && (
                        <>
                          <input
                            className="border rounded px-2 py-1 w-40 text-xs text-gray-700 bg-gray-50"
                            value={linkGerado[v.id]}
                            readOnly
                          />
                          <button
                            className={`bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg text-xs font-semibold ${copiado[v.id] ? "opacity-70" : ""}`}
                            onClick={() => handleCopiarLink(v.id)}
                          >
                            {copiado[v.id] ? "Copiado!" : "Copiar"}
                          </button>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center flex gap-2 justify-center">
                      <button
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold"
                        onClick={() => abrirFormEditar(v)}
                      >
                        Editar
                      </button>
                      <button
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-semibold"
                        onClick={() => confirmarRemover(v.id)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
            >
              Anterior
            </button>
            <span className="mx-2 text-gray-600">Página {pagina} de {totalPaginas}</span>
            <button
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
            >
              Próxima
            </button>
          </div>
        )}
        {/* Modal de confirmação de remoção */}
        {deleteId && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col gap-4 min-w-[300px]">
              <span className="text-lg font-semibold text-red-600">Remover vendedor?</span>
              <span className="text-gray-700 text-sm">Essa ação não pode ser desfeita.</span>
              <div className="flex gap-2 justify-end">
                <button
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold"
                  onClick={() => setDeleteId(null)}
                  disabled={deleteLoading}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                  onClick={handleRemover}
                  disabled={deleteLoading}
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <footer className="mt-8 text-gray-400 text-xs text-center">Desenvolvido com ♥ usando React, Tailwind e Supabase</footer>
    </div>
  );
}
