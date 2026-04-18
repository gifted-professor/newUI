# DESIGN.md

## Design intent

This landing page is a 4-section conversion page, not a feature-heavy marketing site.

The page must communicate one business promise fast:
**turn chaotic influencer email threads into a structured, actionable Feishu table.**

Primary conversion goal:
- Get the visitor to click **“免费获取 200 封邮件解析额度”**
- Then open a modal for **扫码登录** or **留微信号**

What this page should sell:
- Not “AI”
- Not “workflow automation”
- Not “email parsing technology”
- It sells **order, speed, and owner-level control**

Primary brand inspiration:
- `stripe` for trust, clarity, premium B2B feel

Secondary inspiration:
- `linear.app` for dark, sharp, focused execution feel

Local accent:
- `clay` only for the structured data/table visual style in the result section

---

## Brand personality

The brand should feel:

- **Professional** — looks like infrastructure for revenue operations, not a hacky AI toy
- **Trustworthy** — calm, controlled, secure, low-drama
- **Data-driven** — structured, precise, table-first, decision-ready
- **Fast and ruthless** — built for bosses who want results, not education
- **Premium SaaS** — minimal, sharp, high signal, no visual clutter

Avoid being:
- cute
- playful
- overly futuristic
- “AI magic” in a fluffy way
- enterprise-boring with heavy dashboards everywhere

---

## Color system

Use a dark premium SaaS palette.

### Core tokens
- `--bg-0: #0A0B10` — main page background
- `--bg-1: #11131A` — elevated section background
- `--panel: #151923` — cards / containers
- `--panel-2: #1A2030` — active or emphasized panels
- `--line: rgba(255,255,255,0.10)` — default borders
- `--line-strong: rgba(255,255,255,0.18)` — hover / active borders

### Text
- `--text-0: #F5F7FB` — primary text
- `--text-1: #B4BDD0` — secondary text
- `--text-2: #7E879A` — tertiary / small notes

### Brand accents
- `--brand-0: #6E63FF` — primary CTA / key highlights
- `--brand-1: #8A7FFF` — hover / glow edge
- `--cyan-0: #38BDF8` — data / structure accent
- `--green-0: #34D399` — trust / safe / confirmed
- `--amber-0: #FBBF24` — pricing meter / usage hint
- `--red-0: #FB7185` — messy “before” annotations only

### Gradient usage
Use gradients sparingly:
- CTA glow: `linear-gradient(135deg, #8A7FFF 0%, #6E63FF 100%)`
- Section spotlight: `radial-gradient(circle at 50% 0%, rgba(110,99,255,0.22), transparent 55%)`
- Data accent glow: `linear-gradient(135deg, rgba(56,189,248,0.18), rgba(110,99,255,0.10))`

Rules:
- Keep the base dark and matte
- Only Hero CTA and emphasized pricing card may use obvious glow
- Security section should feel cooler and calmer, less glowy than Hero

---

## Typography

Use modern sans-serif with clean numerals.

### Font stack
- Display: `"Inter Tight", "PingFang SC", "Helvetica Neue", sans-serif`
- Body: `"Inter", "PingFang SC", "Helvetica Neue", sans-serif`

If using one stack only:
- `"Inter", "PingFang SC", "Helvetica Neue", sans-serif`

### Type scale
- Hero H1: `64/72`, weight `700`, tracking `-0.03em`
- Hero subcopy: `20/30`, weight `400`
- Section title: `36/44`, weight `650`
- Large card price: `44/48`, weight `700`
- Card title: `20/28`, weight `600`
- Body text: `16/26`, weight `400`
- Small text / notes: `13/20`, weight `400`

Rules:
- H1 max 2 lines on desktop, 3 lines on mobile
- Each section intro max 1 short sentence
- Use tabular numerals for prices, points, and counts
- No ultra-light weights

---

## Layout and spacing

This homepage must feel compact, decisive, and expensive.

### Global layout
- Max content width: `1240px`
- Grid: `12 columns`
- Desktop gutter: `24px`
- Mobile gutter: `20px`

### Vertical rhythm
- Top bar height: `72px`
- Section padding desktop: `112px 0`
- Section padding tablet: `88px 0`
- Section padding mobile: `64px 0`

### Corner radius
- Main section frame: `28px`
- Standard card: `24px`
- Small chips / badges: `999px`
- Button: `16px`

### Borders and depth
- Default border: `1px solid var(--line)`
- Hover border: `1px solid var(--line-strong)`
- Avoid heavy drop shadows
- Use subtle inner highlight and soft outer glow instead of big shadow

### Page rule
Homepage contains only:
1. Hero
2. Before / After result section
3. Trust & Security
4. Pricing & Tokenomics

Do not add:
- feature grid
- FAQ
- customer logo wall
- long product explanation
- blog teaser
- multi-step onboarding explanation

A minimal top bar and minimal footer are allowed, but they must stay visually quiet.

---

## Components

### 1. Top bar
Purpose:
- identity + one CTA
- not a navigation hub

Structure:
- left: logo
- right: primary CTA button
- no full nav menu by default

Style:
- transparent to semi-opaque on scroll
- backdrop blur `12px`
- 1px bottom border on scroll only

### 2. Primary CTA button
Label:
- `免费获取 200 封邮件解析额度`

Specs:
- height `56px`
- horizontal padding `28px`
- font `16/16`, weight `600`
- radius `16px`
- fill: brand gradient
- text: white
- shadow: subtle violet glow only

Behavior:
- same CTA label repeated across page
- no secondary CTA competing with it

### 3. Modal for conversion
Open on CTA click.

Tabs:
- `扫码登录`
- `留微信号`

Desktop default:
- show QR first

Mobile default:
- show input first

Specs:
- width `480px`
- radius `24px`
- dark panel background
- strong focus state on active tab
- form should feel 2-step max, not like signup flow

### 4. Standard card
Used for security cards and pricing cards.

Specs:
- dark panel background
- soft border
- subtle top-left light edge
- padding `28px`
- hover: border brightens, background lifts slightly

### 5. Before / After demo frame
This is the most important visual object on the page after the H1.

Specs:
- aspect ratio `16:9`
- radius `28px`
- split layout or draggable comparison
- left side uses messy visual density
- right side uses clean structured table UI
- center divider can glow lightly

---

## Interaction states

### Hover
- Buttons: brighten by `4%`, lift `1px`
- Cards: border opacity up, background slightly lighter
- No exaggerated scale effects

### Focus
- Visible focus ring required on CTA and form fields
- Focus ring color: `rgba(110,99,255,0.55)`
- Ring size: `0 0 0 4px`

### Active
- Buttons depress by `1px`
- Keep response crisp, not bouncy

### Disabled
- Lower opacity to `0.45`
- Remove glow
- Cursor not-allowed

---

## Motion

Motion should feel controlled and premium.

### Timing
- Fast interactions: `180ms`
- Card / panel hover: `220ms`
- Modal open: `240ms`
- Section reveal: `320ms`

### Easing
- Use soft ease-out
- Avoid elastic or playful spring

### Allowed motion
- Fade + translateY `12px` for section reveal
- Subtle background glow drift in Hero
- Before/After auto-preview once on first viewport entry

### Avoid
- heavy parallax
- floating 3D blobs
- overly animated gradients
- continuous looping motion that distracts from CTA

---

## Imagery / illustration

The product proof must come from UI transformation, not illustration.

### Hero imagery
Use restrained abstract UI fragments:
- floating messy email snippets
- arrows / structure lines
- clean table cells emerging in the background

Do not let Hero become a full product demo.
Hero image supports the promise; the next section proves it.

### Before visual
Must show:
- crowded inbox or mixed-language email thread
- red markup / noise / inconsistent quote formats
- varying reply lengths
- obvious cognitive load

### After visual
Must show a polished Feishu-style multi-dimensional table containing:
- influencer avatar
- handle / channel
- follower count
- quoted price
- bottom-line price
- intention score
- note summary

Rules:
- “after” must look executable, not decorative
- use realistic but anonymized fake data
- do not use generic AI illustration, robot icons, or glowing brains

### Security icons
Use simple line icons:
- shield / key
- pipeline / one-way flow
- Feishu-like integration node

### Pricing visuals
No gimmicks.
Use clean cards, numeric hierarchy, and subtle point-meter accent.

---

## Copy tone

Copy should sound like it understands the boss’s pain immediately.

Tone:
- short
- direct
- outcome-first
- anti-jargon
- slightly aggressive in clarity
- no technical self-congratulation

### Good copy patterns
- 把海外网红回信，直接变成可报价表
- 5 分钟看清谁能谈、谁别谈
- 不让 BD 再做人肉分拣机
- 数据进你自己的飞书，不进我们的仓库
- 先免费跑通，再按算力付费

### Bad copy patterns
- 基于先进大模型能力打造智能化工作流平台
- 一站式全链路达人营销基础设施
- 多模态语义理解驱动商业智能升级

### Copy limits
- Hero subcopy max 22 Chinese characters x 2 lines equivalent
- Security card body max 2 lines
- Pricing note max 1 line
- One message per section

---

## Do / Don't

### Do
- Lead with business result, not technology
- Use strong contrast between chaos and order
- Keep every section visually singular and easy to scan
- Make the CTA obvious in under 1 second
- Make trust feel calm and factual
- Make pricing feel fair and transparent

### Don’t
- Don’t explain the parsing pipeline in detail
- Don’t show too many product screens
- Don’t add more than one primary conversion action
- Don’t make the page look like a dev tool dashboard
- Don’t use bright rainbow gradients everywhere
- Don’t use testimonial-heavy, noisy growth-site clichés

---

## Page-specific guidance

## Homepage

### Overall structure
- Minimal top bar
- Hero
- Before / After
- Trust & Security
- Pricing & Tokenomics
- Minimal footer

The entire page should feel like one continuous narrative:
**痛点暴击 → 魔法证明 → 安全兜底 → 价格成交**

---

### Section 1 — Hero

#### Goal
Deliver the core hook in 3 seconds and push the single CTA.

#### Layout
- Vertical alignment near center
- Text block centered or slightly left-of-center
- Background uses subtle spotlight and faint UI fragments
- Keep composition clean with one focal point: headline + CTA

#### Content
Eyebrow:
- `给出海团队的达人回信整理引擎`

H1 options:
- `把海外网红回信，直接变成可报价表`
- `把你的出海 BD，从人肉分拣机里解放出来`

Subcopy options:
- `自动提取报价、底线与合作意向，5 分钟同步到飞书。`
- `从混乱邮件里，直接拉出可跟进、可报价、可决策的数据表。`

Primary CTA:
- `免费获取 200 封邮件解析额度`

Micro-trust line below CTA:
- `OAuth 接入 / 不存原始邮件 / 飞书直达`

#### UI rules
- H1 occupies most visual weight
- CTA must be larger than any other button on page
- Do not place multiple actions next to the CTA
- If adding hero imagery, keep opacity low enough that text still dominates

---

### Section 2 — Before & After

#### Goal
Show the product’s magic without explanation.

#### Layout
- Full-width framed comparison module
- Desktop: 45% messy inbox + 55% clean table
- Mobile: segmented switch between `Before` and `After`, default to `After` after first reveal

#### Section heading
- `从回信地狱，到可报价表`

Optional one-line subcopy:
- `你买的不是软件，是把混乱变成秩序的能力。`

#### Before state design
Show:
- multilingual email chain
- inconsistent quote formats
- emojis / slang / mixed currencies
- too many lines and no structure

Visual treatment:
- warmer mess colors: muted red / amber markers
- denser text blocks
- tighter spacing
- visible cognitive overload

#### After state design
Show a polished Feishu-like data table with:
- avatar
- 博主名 / handle
- 粉丝量
- 首报价格
- 底线报价
- 高意向打分
- 备注摘要

Visual treatment:
- cooler structure colors: cyan / green / white
- clear row rhythm
- high readability
- strong table hierarchy

#### Motion
- optional draggable split handle
- optional 6–8 second autoplay morph when entering viewport
- motion must serve proof, not spectacle

---

### Section 3 — Trust & Security

#### Goal
Neutralize the biggest B2B buying fear: data leakage.

#### Layout
- 3 equal cards in one row
- desktop gap `20px`
- mobile stack with `16px` gap
- cards should feel stable and factual

#### Section heading
- `老板最怕的，我们先挡住`

#### Card 1
Title:
- `无密码接入`

Body:
- `支持 OAuth 或应用专属授权码，绝不索要您的邮箱原密码。`

Icon:
- shield + key

Accent:
- cyan edge highlight

#### Card 2
Title:
- `单向水管，数据不落库`

Body:
- `AI 解析后即刻焚毁，您的网红商业机密只存在于您自己的飞书里。`

Icon:
- one-way pipeline / vault

Accent:
- green edge highlight

#### Card 3
Title:
- `私有化交付`

Body:
- `无缝对接飞书，不需要员工学习新系统。`

Icon:
- integration node / workspace

Accent:
- violet edge highlight

#### UI rules
- Each card title must be short and bold
- Body text max 2 lines
- Icons are line-based, not illustrated mascots
- Avoid badge overload or compliance-logo clutter unless actually needed

---

### Section 4 — Pricing & Tokenomics

#### Goal
Make buying feel low-risk and transparent.

#### Layout
- 2 pricing cards side by side
- one slim info strip below
- pricing area should feel clean and decisive, not crowded

#### Section heading
- `先免费跑通，再按水电表付费`

#### Left card — POC 验证
Plan name:
- `POC 验证`

Price:
- `0 元`

Included:
- `包含 200 点算力`
- `限新用户跑通跑透`

Style:
- outlined premium card
- lower visual emphasis than paid plan
- still clickable with the same CTA

#### Right card — 企业基础版
Plan name:
- `企业基础版`

Price:
- `299 元 / 月`

Included:
- `包含 2000 点核心解析算力`
- `飞书直连`
- `适合固定团队持续跑单`

Style:
- elevated card
- subtle brand glow
- should feel like the default commercial choice

#### Lower strip
Text:
- `表格内可随时按需触发深度实时爬取，消耗额外点数。`

Style:
- single-line info bar
- muted amber accent
- not louder than the paid plan card

#### UI rules
- Price must dominate each card
- Supporting bullets max 3 per card
- No annual discount complexity on this version
- Keep the model transparent: 门票 + 水电表

---

## Responsive behavior

### Mobile
- Keep the 4-section order unchanged
- Hero CTA full width
- Before / After becomes vertical or tab-switch layout
- Security cards stack vertically
- Pricing cards stack with enterprise plan shown first

### Tablet
- Keep comparison section large
- Security can go 2 + 1 if needed, but 3-across preferred when space allows

### Desktop
- Prioritize width and contrast
- The Before / After module should feel like the page’s visual centerpiece

---

## Minimal footer

Allowed content only:
- logo
- one short line: `让达人合作从邮件混乱，进入结构化成交。`
- optional legal / contact link if needed

Do not turn the footer into a sitemap.

---

## Final implementation rule

If any new block does not directly strengthen one of these 4 jobs, remove it:

1. hit pain
2. prove transformation
3. remove fear
4. close with pricing + CTA
