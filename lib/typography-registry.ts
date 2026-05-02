export interface TypoElementDef {
  key: string
  label: string
  sampleText: string
}

export interface TypoScopeDef {
  scope: string
  label: string
  elements: TypoElementDef[]
}

export const TYPO_SCOPES: readonly TypoScopeDef[] = [
  {
    scope: 'hero',
    label: 'Hero',
    elements: [
      { key: 'title', label: 'Заголовок', sampleText: 'Цветы для особых моментов' },
      { key: 'accent', label: 'Акцент в заголовке', sampleText: 'с душой' },
      { key: 'subtitle', label: 'Подзаголовок', sampleText: 'Составим букет, который расскажет историю' },
      { key: 'cta', label: 'Основная кнопка', sampleText: 'Заказать' },
      { key: 'secondary_cta', label: 'Вторая кнопка', sampleText: 'Смотреть каталог' },
    ],
  },
  {
    scope: 'products',
    label: 'Блок «Товары» (карусель)',
    elements: [
      { key: 'heading', label: 'Заголовок секции', sampleText: 'Наши товары' },
      { key: 'subheading', label: 'Подзаголовок секции', sampleText: 'Созданы с любовью и вниманием к деталям' },
      { key: 'card_title', label: 'Название карточки', sampleText: 'Букет «Аврора»' },
      { key: 'card_price', label: 'Цена', sampleText: '3 500 ₽' },
      { key: 'card_description', label: 'Описание карточки', sampleText: 'Розы Freedom, эвкалипт, рускус' },
      { key: 'cta', label: 'Кнопка карточки', sampleText: 'Заказать' },
    ],
  },
  {
    scope: 'categories',
    label: 'Блок «Категории»',
    elements: [
      { key: 'heading', label: 'Заголовок секции', sampleText: 'Категории' },
      { key: 'subheading', label: 'Подзаголовок секции', sampleText: 'Всё для создания праздника' },
      { key: 'card_title', label: 'Название категории', sampleText: 'Букеты' },
      { key: 'card_description', label: 'Описание категории', sampleText: 'Авторские композиции на любой повод' },
    ],
  },
  {
    scope: 'features',
    label: 'Блок «Преимущества»',
    elements: [
      { key: 'heading', label: 'Заголовок секции', sampleText: 'Почему мы' },
      { key: 'subheading', label: 'Подзаголовок секции', sampleText: 'Работаем круглосуточно' },
      { key: 'card_title', label: 'Название преимущества', sampleText: 'Свежесть' },
      { key: 'card_description', label: 'Описание', sampleText: 'Ежедневные поставки от флористов' },
    ],
  },
  {
    scope: 'contact',
    label: 'Блок «Контакты»',
    elements: [
      { key: 'heading', label: 'Заголовок секции', sampleText: 'Свяжитесь с нами' },
      { key: 'subheading', label: 'Подзаголовок секции', sampleText: 'Поможем подобрать идеальный букет' },
      { key: 'label', label: 'Подпись поля', sampleText: 'Адрес' },
      { key: 'value', label: 'Значение поля', sampleText: 'г. Омск, ул. Карла Маркса, 50' },
      { key: 'form_label', label: 'Подпись в форме', sampleText: 'Имя' },
    ],
  },
  {
    scope: 'footer',
    label: 'Футер',
    elements: [
      { key: 'brand', label: 'Название бренда', sampleText: 'ФЛОРМАЖОР' },
      { key: 'tagline', label: 'Слоган', sampleText: 'С любовью из Омска' },
      { key: 'link', label: 'Ссылка', sampleText: '+7 (933) 303-39-42' },
      { key: 'copyright', label: 'Копирайт', sampleText: '© 2026 ФЛОРМАЖОР' },
    ],
  },
  {
    scope: 'catalog_page',
    label: 'Страница каталога',
    elements: [
      { key: 'heading', label: 'Заголовок страницы', sampleText: 'Каталог товаров' },
      { key: 'subheading', label: 'Подзаголовок страницы', sampleText: 'Все наши композиции в одном месте' },
      { key: 'filter_chip', label: 'Чип фильтра', sampleText: 'Букеты' },
      { key: 'card_title', label: 'Название карточки', sampleText: 'Композиция «Закат»' },
      { key: 'card_price', label: 'Цена в карточке', sampleText: 'от 4 500 ₽' },
    ],
  },
  {
    scope: 'product_page',
    label: 'Страница товара',
    elements: [
      { key: 'title', label: 'Заголовок', sampleText: 'Букет «Аврора»' },
      { key: 'price', label: 'Цена', sampleText: '3 500 ₽' },
      { key: 'description', label: 'Описание', sampleText: 'Букет собран из свежих роз Freedom...' },
      { key: 'meta', label: 'Мета-информация', sampleText: 'Категория: Букеты' },
    ],
  },
] as const

export const FONT_FAMILY_OPTIONS = [
  'Cormorant Garamond',
  'Playfair Display',
  'Lora',
  'Merriweather',
  'PT Serif',
  'EB Garamond',
  'Crimson Pro',
  'Libre Baskerville',
  'Montserrat',
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Nunito',
  'Manrope',
  'DM Sans',
  'Jost',
  'Source Sans 3',
  'Poppins',
  'Raleway',
  'Work Sans',
  'Rubik',
  'Caveat',
  'Pacifico',
  'Great Vibes',
  'Dancing Script',
] as const

export const FONT_WEIGHT_OPTIONS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'] as const
export const TEXT_TRANSFORM_OPTIONS = ['none', 'uppercase', 'lowercase', 'capitalize'] as const
export const TEXT_ALIGN_OPTIONS = ['left', 'center', 'right', 'justify'] as const
