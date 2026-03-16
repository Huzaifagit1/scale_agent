// Field definitions from GHL custom fields
// Using TECH versions where duplicates exist

export type FieldDef = {
  key: string;
  ghlId: string;
  label: string;
  type: 'TEXT' | 'NUMERICAL' | 'MONETORY' | 'CHECKBOX' | 'RADIO' | 'DATE' | 'LARGE_TEXT';
  options?: string[];
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
      { key: 'tipo_de_imovel', ghlId: 'ih9s4iEpVxFYaz1hdxfC', label: 'Tipo do imóvel', type: 'RADIO', options: ['Apartamento', 'Casa', 'Casa comercial', 'Chacara', 'Terreno', 'Sala', 'Salao', 'Ponto', 'Conjunto', 'Conj. comercial', 'Prédio comercial', 'Galpao', 'Galpão Industrial', 'Barracao', 'Armazem', 'Sitio', 'Fazenda', 'Haras', 'Flat', 'Kitnet', 'Duplex', 'Cobertura', 'Sobrado', 'Terreo(a)', 'Studio', 'Normal', 'Padrão'] },
      { key: 'categoria_do_imovel', ghlId: 'hkUd2nSwCOKCQGl0HBM7', label: 'Categoria', type: 'RADIO', options: ['Cobertura', 'Duplex', 'Flat', 'Kitnet', 'Sobrado', 'Terreo(a)', 'Normal', 'Padrão'] },
      { key: 'finalidade', ghlId: 'KHnkDUqmqTBGMZG7OWlD', label: 'Finalidade', type: 'RADIO', options: ['Comercial', 'Industrial', 'Residencial', 'Rural', 'Temporada'] },
      { key: 'situacao_da_disponibilidade_atualizacao', ghlId: 'ix8cozN35Zl1H3JvPa1C', label: 'Situação', type: 'RADIO', options: ['Ativo', 'Inativo', 'Vendido', 'Locado', 'Permutado', 'Em avaliação', 'Avaliado', 'Em validação', 'Suspenso'] },
      { key: 'referencia_do_imovel', ghlId: 'W5rMkS4725rkUH6YPfUW', label: 'Referência', type: 'TEXT' },
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
      { key: 'pais_endereco', ghlId: '9UyIF1o3vxuAnSvPRI1G', label: 'País', type: 'TEXT' },
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
      { key: 'temporada', ghlId: 'T88XCd8usC8jQLyurI0b', label: 'Temporada', type: 'TEXT' },
      { key: 'permuta', ghlId: 'zJLi1she6Sex8xGjyu6n', label: 'Permuta', type: 'TEXT' },
    ]
  },
  {
    id: 'descricao',
    title: 'Descrição',
    fields: [
      { key: 'descricao_do_imovel', ghlId: '5eAYN3imP93cH8ntQ7sA', label: 'Descrição do imóvel', type: 'LARGE_TEXT' },
    ]
  },
  {
    id: 'caracteristicas_basico',
    title: 'Características - Básico',
    fields: [
      {
        key: 'caracteristicas_basico',
        ghlId: 'ny3cIt9wAFiV1UIPXo35',
        label: 'Básico',
        type: 'CHECKBOX',
        options: ['Acesso deficientes', 'Corrimão', 'Gradeado', 'Pavimentação', 'Água', 'Energia', 'Hidrômetro individual', 'Rampas', 'Água quente', 'Esgoto', 'Piso tátil', 'Reformado']
      },
    ]
  },
  {
    id: 'caracteristicas_social',
    title: 'Características - Social',
    fields: [
      {
        key: 'caracteristicas_social',
        ghlId: 'PxxX7tGHbcTX1yEEQ1KW',
        label: 'Social',
        type: 'CHECKBOX',
        options: ['Estar íntimo', 'Sacada lateral', 'Sacada frente', 'Varanda', 'Sacada fundo', 'Varanda gourmet']
      },
    ]
  },
  {
    id: 'caracteristicas_lazer',
    title: 'Características - Lazer',
    fields: [
      {
        key: 'caracteristicas_lazer',
        ghlId: '2zouqMcrTHD6aB2S6ieZ',
        label: 'Lazer',
        type: 'CHECKBOX',
        options: ['Adega', 'Bar', 'Deck', 'Piscina', 'Piscina aquecida', 'Academia', 'Salão de jogos', 'SPA', 'Área de lazer', 'Campo de futebol', 'Lazer no pilotis', 'Piscina infantil', 'Quadra esportiva', 'Salão de festas', 'Sauna', 'Vestiário', 'Área verde', 'Churrasqueira', 'Ofurô', 'Piscina privativa', 'Quadra de tênis', 'Salão gourmet', 'Sauna privativa']
      },
    ]
  },
  {
    id: 'caracteristicas_servicos',
    title: 'Características - Serviços',
    fields: [
      {
        key: 'caracteristicas_servicos',
        ghlId: '3xVQ1rlannbhvRYYmNbu',
        label: 'Serviços',
        type: 'CHECKBOX',
        options: ['Área de serviço', 'Banheiro empregada', 'Cozinha americana', 'Dep. privativo subsolo', 'Edícula', 'Espera para Automação', 'Garagem para barco', 'Guarita', 'Portaria 24h', 'Zelador', 'Automatizado', 'Copa', 'Cozinha independente', 'Despensa', 'Elevador de serviço', 'Fechadura eletrônica', 'Garagem Fechada', 'Hall', 'Rede de segurança', 'Banheiro auxiliar', 'Cozinha', 'Cozinha planejada', 'Dormitório empregada', 'Entrada de serviço', 'Gabinete', 'Gás natural', 'Lavanderia', 'Terraço']
      },
    ]
  },
  {
    id: 'caracteristicas_acabamento',
    title: 'Características - Acabamento',
    fields: [
      {
        key: 'caracteristicas_acabamento',
        ghlId: 'P0aBwGNc88aQ0J3orL8O',
        label: 'Acabamento',
        type: 'CHECKBOX',
        options: ['Assoalho', 'Contra-piso', 'Mármore', 'Porcelanato', 'Carpete', 'Granito', 'Piso frio', 'Taco', 'Carpete madeira', 'Laminado', 'Piso cerâmica', 'Vinílico']
      },
    ]
  },
  {
    id: 'caracteristicas_armarios',
    title: 'Características - Armários',
    fields: [
      {
        key: 'caracteristicas_armarios',
        ghlId: 'VpCEYiNPFE3WHsEMLNGy',
        label: 'Armários',
        type: 'CHECKBOX',
        options: ['Banheiro', 'Dormitórios', 'Closet', 'Sala', 'Cozinha', 'Área de Serviço']
      },
    ]
  },
  {
    id: 'caracteristicas_intima',
    title: 'Características - Íntima',
    fields: [
      {
        key: 'caracteristicas_intima',
        ghlId: 'A76YO1r25jGTeufxwKTV',
        label: 'Íntima',
        type: 'CHECKBOX',
        options: ['Suíte master', 'Roupeiro', 'Lavabo', 'Banheira']
      },
    ]
  },
  {
    id: 'caracteristicas_destaques',
    title: 'Características - Destaques',
    fields: [
      {
        key: 'caracteristicas_destaques',
        ghlId: 'AlmkB0Xeo62SUofpOuew',
        label: 'Destaques',
        type: 'CHECKBOX',
        options: ['Aceita PET', 'Aquecimento solar', 'Box', 'Chuveiro a gás', 'Cooktop', 'Espera para split', 'Frente para clube', 'Interfone', 'Lareira', 'Microondas', 'Persiana elétrica', 'Quintal', 'Sol da manhã', 'Telefone', 'Ventilador de teto', 'Vista para lagoa', 'Vista para serra', 'Alarme', 'Ar condicionado', 'Calefação', 'Circuito para TV', 'Cortinas', 'Escritório', 'Frente para mar', 'Janela antirruído', 'Luz natural', 'Mobiliado', 'Perto do metrô', 'Rua silenciosa', 'Sol da tarde', 'TV a cabo', 'Vista livre', 'Vista para mar', 'Wi-Fi', 'Aquecimento central', 'Beira lago', 'Chuveiro elétrico', 'Cobertura coletiva', 'Decorado', 'Forno', 'Frente para praça', 'Jardim', 'Marina', 'Móveis planejados', 'Portão eletrônico', 'Sistema incêndio', 'Split', 'Varal', 'Vista para cidade', 'Vista panorâmica']
      },
    ]
  },
];
