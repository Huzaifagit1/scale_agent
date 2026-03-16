// Field definitions from GHL custom fields
// Using TECH versions where duplicates exist

export type FieldDef = {
  key: string;
  ghlId: string;
  label: string;
  type: 'TEXT' | 'NUMERICAL' | 'MONETORY' | 'CHECKBOX' | 'RADIO' | 'DATE' | 'LARGE_TEXT';
  options?: string[];
  readOnly?: boolean;
};

export type Section = {
  id: string;
  title: string;
  fields: FieldDef[];
};

export const FORM_SECTIONS: Section[] = [
  {
    id: 'negocio',
    title: 'Pretensão do Negócio',
    fields: [
      { key: 'escolha_a_pretensao_do_negocio', ghlId: '3yU7SZgRWPPY64qIAejI', label: 'Pretensão do negócio', type: 'CHECKBOX', options: ['Venda', 'Aluguel'] },
      { key: 'tipo_de_imovel', ghlId: 'ih9s4iEpVxFYaz1hdxfC', label: 'Tipo do imóvel', type: 'RADIO', options: ['Apartamento', 'Area', 'Armazem', 'Barracao', 'Casa', 'Casa comercial', 'Chacara', 'Conjunto', 'Fazenda', 'Galpao', 'Haras', 'Ponto', 'Prédio comercial', 'Sala', 'Sala comercial', 'Salao', 'Sitio', 'Terreno'] },
      { key: 'categoria_do_imovel', ghlId: 'hkUd2nSwCOKCQGl0HBM7', label: 'Categoria', type: 'RADIO', options: ['Cobertura', 'Duplex', 'Flat', 'Kitnet', 'Sobrado', 'Terreo(a)', 'Normal', 'Padrão'] },
      { key: 'finalidade', ghlId: 'KHnkDUqmqTBGMZG7OWlD', label: 'Finalidade', type: 'RADIO', options: ['Comercial', 'Industrial', 'Residencial', 'Rural', 'Temporada'] },
      { key: 'situacao_da_disponibilidade_atualizacao', ghlId: 'ix8cozN35Zl1H3JvPa1C', label: 'Situação', type: 'RADIO', options: ['Ativo', 'Inativo', 'Vendido', 'Locado', 'Permutado', 'Suspenso'] },
      { key: 'referencia_do_imovel', ghlId: 'W5rMkS4725rkUH6YPfUW', label: 'Referência', type: 'TEXT', readOnly: true },
    ]
  },
  {
    id: 'localizacao',
    title: 'Localização',
    fields: [
      { key: 'cep', ghlId: '3L4fwDOWVKe82Di69VHz', label: 'CEP', type: 'TEXT' },
      { key: 'endereco_do_imovel', ghlId: 'M2KLKYf5vJEQnkH9Mv9L', label: 'Endereço', type: 'TEXT' },
      { key: 'numero_do_endereco_do_imovel', ghlId: 'D2LQH6MUjQy11oU0GcFA', label: 'Número', type: 'NUMERICAL' },
      { key: 'complemento_de_endereco', ghlId: 'tZY4M1PavIQ2mfRVSpdM', label: 'Complemento', type: 'TEXT' },
      { key: 'bairro_commercial', ghlId: 'vOoCUqJ1Yh4JTkqyUhZH', label: 'Bairro', type: 'TEXT' },
      { key: 'bairro_oficial_endereco', ghlId: 'HakqR4XMZe4uP2LNpfw1', label: 'Bairro Oficial', type: 'TEXT' },
      { key: 'cidade_endereco', ghlId: '0Uvqnpd9UYmWz89bpEmv', label: 'Cidade', type: 'TEXT' },
      { key: 'uf_endereco', ghlId: 'HC2HaCwWHqP4Otws3lTL', label: 'UF', type: 'TEXT' },
      // País removed (always Brazil)
      { key: 'regiao_endereco', ghlId: 'Q2Sv6T5P640VbLgmnkeA', label: 'Região', type: 'TEXT' },
      { key: 'quadra_endereco', ghlId: '3Hb8YSAALYe2H5FV7uJg', label: 'Quadra', type: 'TEXT' },
      { key: 'lote_endereco', ghlId: '4MniFx7ORQ1XfxweZXnK', label: 'Lote', type: 'TEXT' },
      { key: 'ponto_de_referencia_endereco', ghlId: 'zmPvDpDgRln0qlIdycwe', label: 'Ponto de referência', type: 'TEXT' },
    ]
  },
  {
    id: 'detalhes_principal',
    title: 'Detalhes do Imóvel',
    fields: [
      { key: 'numero_de_dormitorios', ghlId: 'xYywYChGq6qSMbc78101', label: 'Dormitórios', type: 'NUMERICAL' },
      { key: 'numero_de_suites', ghlId: 'lbweI26eT6Gri6sasv8h', label: 'Suítes', type: 'NUMERICAL' },
      { key: 'numero_de_suites_com_closet', ghlId: 'Ymmo3NAsa0ueqiY6QBFP', label: 'Suítes c/ Closet', type: 'NUMERICAL' },
      { key: 'numero_de_demi_suites', ghlId: 'GLkvd1vp4MVx7tB0m3xd', label: 'Demi-suítes', type: 'NUMERICAL' },
      { key: 'numero_de_banheiros', ghlId: 'GS7JFbinP4cnruQZD0by', label: 'Banheiros', type: 'NUMERICAL' },
      { key: 'numero_de_salas', ghlId: '6JtaMY7Y3NRJSGG6UtNM', label: 'Salas', type: 'NUMERICAL' },
      { key: 'numero_de_sala_de_estar', ghlId: 'JSOcKSibeBUyql17zNkW', label: 'Sala de estar', type: 'NUMERICAL' },
      { key: 'numero_de_sala_de_jantar', ghlId: 'dEK7LVzNoOi6572nISYI', label: 'Sala de jantar', type: 'NUMERICAL' },
      { key: 'numero_de_salas_de_tv', ghlId: 'hsPtqsDTW5jc5Tzk3KyC', label: 'Salas de TV', type: 'NUMERICAL' },
      { key: 'numero_de_living_ambientes', ghlId: 'uLQCGqErovaRQHLkhBuQ', label: 'Living/Ambiêntes', type: 'NUMERICAL' },
      { key: 'numero_de_garagens', ghlId: 'h5JLE062PH7BxpjsnKjE', label: 'Garagens', type: 'NUMERICAL' },
      { key: 'numero_de_vagas_garagens_cobertas', ghlId: 'TnbZjfI2NxZx1KaEzHmW', label: 'Gar. Cobertas', type: 'NUMERICAL' },
      { key: 'numero_de_vagas_de_garagens_descobertas', ghlId: 'IBICWKEWycF5i1EbpnSq', label: 'Gar. Descobertas', type: 'NUMERICAL' },
      { key: 'numero_de_elevadores', ghlId: 'ejsLQ9w54RTrF2ggPXrv', label: 'Elevadores', type: 'NUMERICAL' },
      { key: 'numero_de_andares', ghlId: 'JfPpfCUtUH78YVwyfp9t', label: 'Total de andares', type: 'NUMERICAL' },
    ]
  },
  {
    id: 'areas',
    title: 'Áreas do Imóvel',
    fields: [
      { key: 'area_privativa', ghlId: 'fCrAI3WBdxhctjNyzPni', label: 'Área privativa (m²)', type: 'NUMERICAL' },
      { key: 'area_total', ghlId: 'VLP8YuhpHPos2nyWLGBD', label: 'Área total (m²)', type: 'NUMERICAL' },
      { key: 'area_construida', ghlId: 'ymzzBxf0Ov6R91qCvP0j', label: 'Área construída (m²)', type: 'NUMERICAL' },
      { key: 'area_dimensao_terreno', ghlId: 'q3cnur9jisNIaEIuzMRV', label: 'Dimensão do terreno (m²)', type: 'NUMERICAL' },
      { key: 'area_util', ghlId: 'HeA8WLt1QsuW5hP2e8uT', label: 'Área útil (m²)', type: 'NUMERICAL' },
      { key: 'area_comum', ghlId: 'EqX49HmgvgzrGGyAstOi', label: 'Comum', type: 'NUMERICAL' },
    ]
  },
  {
    id: 'valores',
    title: 'Valores',
    fields: [
      { key: 'valor_de_venda', ghlId: 'HnWcGsVB91q6MxYeBa2o', label: 'Preço de venda (R$)', type: 'MONETORY' },
      { key: 'valor_de_locacao', ghlId: 'Q5Pxq72EKf0Ndv1zyZjJ', label: 'Preço de locação (R$)', type: 'MONETORY' },
      { key: 'valor_do_iptu', ghlId: 'FhaCPvzDz6p0F9g6dvhh', label: 'Valor do IPTU (R$)', type: 'MONETORY' },
      { key: 'pagamento_do_iptu', ghlId: '7ZKCURSrzLE2GAL8W8EN', label: 'Pagamento do IPTU (PI)', type: 'RADIO', options: ['Mensal', 'Anual', 'Isento'] },
      { key: 'valor_do_condominio', ghlId: 'X83IBp8lOW4g7E5PeN9J', label: 'Valor do condomínio (R$)', type: 'MONETORY' },
      { key: 'temporada', ghlId: 'T88XCd8usC8jQLyurI0b', label: 'Temporada', type: 'RADIO', options: ['Sim', 'Não'] },
      { key: 'permuta', ghlId: 'zJLi1she6Sex8xGjyu6n', label: 'Permuta', type: 'RADIO', options: ['Sim', 'Não'] },
    ]
  },
];
