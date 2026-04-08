"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircleIcon,
  BotIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  LayoutTemplateIcon,
  Layers3Icon,
  PaletteIcon,
  PanelBottomOpenIcon,
  PanelRightOpenIcon,
  SendHorizontalIcon,
  Settings2Icon,
  SparklesIcon,
  Table2Icon,
  UserIcon,
} from "lucide-react";
import type { FormEvent } from "react";
import styles from "./page.module.css";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/ui/toolbar";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PLAYGROUND_OPTIONS = [
  { value: "button", label: "Button" },
  { value: "field", label: "Field / Input" },
  { value: "dialog", label: "Dialog" },
  { value: "alert", label: "Alert" },
  { value: "conversation", label: "Conversation" },
];

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  title: string;
  body: string;
  meta: string;
};

export default function PlaygroundPage() {
  const [selectedComponent, setSelectedComponent] = useState("button");
  const [name, setName] = useState("Card Builder");
  const [notes, setNotes] = useState(
    "这一页只用于学习 coss 组件、观察交互和试配色，不接业务导出逻辑。"
  );
  const [promptDraft, setPromptDraft] = useState(
    "帮我把名片编辑页的顶部操作区整理得更专业。"
  );
  const [conversation, setConversation] = useState<ChatMessage[]>([
    {
      id: "m-1",
      role: "agent",
      title: "Agent",
      body:
        "可以。我会先把这个需求拆成三个观察点：信息层级、主动作优先级和右侧预览区的稳定性，然后再决定该改动哪些 primitive。",
      meta: "thinking · just now",
    },
    {
      id: "m-2",
      role: "user",
      title: "You",
      body: "先不要改功能，只想看 UI 结构和交互节奏怎么更稳。",
      meta: "sent · just now",
    },
    {
      id: "m-3",
      role: "agent",
      title: "Agent",
      body:
        "收到。那我会优先调整 header、surface 分层和表单分组，并保留导出链路、字段逻辑和模板切换语义不变。",
      meta: "ready · just now",
    },
  ]);

  useEffect(() => {
    document.body.dataset.playground = "true";

    return () => {
      delete document.body.dataset.playground;
    };
  }, []);

  function handleConversationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = promptDraft.trim();
    if (!content) return;

    const normalized = content.replace(/\s+/g, " ");
    setConversation((current) => [
      ...current,
      {
        id: `m-${current.length + 1}`,
        role: "user",
        title: "You",
        body: normalized,
        meta: "sent · now",
      },
      {
        id: `m-${current.length + 2}`,
        role: "agent",
        title: "Agent",
        body: `我会按这个输入继续展开：先确认目标界面、再选择合适的 coss primitive，最后把改动限制在局部表面和交互层，不直接碰底层业务逻辑。当前收到的请求是：“${normalized}”`,
        meta: "draft reply · now",
      },
    ]);
    setPromptDraft("");
    setSelectedComponent("conversation");
  }

  return (
    <main className={styles.page}>
      <style jsx global>{`
        body[data-playground="true"] [data-slot="button"],
        body[data-playground="true"] [data-slot="dialog-trigger"],
        body[data-playground="true"] [data-slot="dialog-close"],
        body[data-playground="true"] [data-slot="popover-trigger"],
        body[data-playground="true"] [data-slot="sheet-trigger"],
        body[data-playground="true"] [data-slot="drawer-trigger"],
        body[data-playground="true"] [data-slot="toolbar-button"],
        body[data-playground="true"] [data-slot="toolbar-link"] {
          border-radius: 9999px;
        }

        body[data-playground="true"] [data-slot="button"]::before,
        body[data-playground="true"] [data-slot="dialog-trigger"]::before,
        body[data-playground="true"] [data-slot="dialog-close"]::before,
        body[data-playground="true"] [data-slot="popover-trigger"]::before,
        body[data-playground="true"] [data-slot="sheet-trigger"]::before,
        body[data-playground="true"] [data-slot="drawer-trigger"]::before,
        body[data-playground="true"] [data-slot="toolbar-button"]::before,
        body[data-playground="true"] [data-slot="toolbar-link"]::before {
          border-radius: inherit;
        }

        body[data-playground="true"] [data-slot="badge"],
        body[data-playground="true"] [data-slot="toolbar"],
        body[data-playground="true"] [data-slot="tabs-list"],
        body[data-playground="true"] [data-slot="tabs-tab"],
        body[data-playground="true"] [data-slot="tab-indicator"] {
          border-radius: 9999px;
        }

        body[data-playground="true"] [data-slot="badge"] {
          padding-inline: 0.8rem;
        }
      `}</style>
      <div className={styles.shell}>
        <Card className={styles.hero}>
          <div className={styles.heroHeader}>
            <div className={styles.heroText}>
              <div className={styles.heroMeta}>
                <Badge variant="secondary">coss playground</Badge>
                <Badge variant="outline">experiment branch</Badge>
                <Badge variant="info">Base UI</Badge>
              </div>
              <h1 className={styles.heroTitle}>组件学习场</h1>
              <p className={styles.heroDescription}>
                按 coss 文档要求接入主题 token、Base UI 根布局和组件源码。这个页面专门用来观察组件默认外观、表单组合方式和弹层表现，不碰现有名片编辑逻辑。
              </p>
            </div>
            <div className={styles.heroActions}>
              <Button render={<Link href="/" />} variant="outline">
                返回主页面
              </Button>
              <Dialog>
                <DialogTrigger render={<Button />}>打开示例弹窗</DialogTrigger>
                <DialogPopup>
                  <DialogHeader>
                    <DialogTitle>Dialog 试验</DialogTitle>
                    <DialogDescription>
                      这里用来验证 coss / Base UI 的 portal、backdrop 和标题区结构。
                    </DialogDescription>
                  </DialogHeader>
                  <DialogPanel>
                    <Alert variant="info">
                      <SparklesIcon />
                      <AlertTitle>弹层已接入</AlertTitle>
                      <AlertDescription>
                        根布局已经加了 `body.relative` 和 `isolate` 包裹层，portaled
                        组件现在可以在 playground 里直接验证。
                      </AlertDescription>
                    </Alert>
                  </DialogPanel>
                  <DialogFooter>
                    <DialogClose render={<Button variant="ghost" />}>
                      关闭
                    </DialogClose>
                    <Button>确认结构</Button>
                  </DialogFooter>
                </DialogPopup>
              </Dialog>
            </div>
          </div>
        </Card>

        <div className={styles.grid}>
          <div className={styles.stack}>
            <Card>
              <CardHeader>
                <div className={styles.sectionHeader}>
                  <CardTitle className={styles.sectionTitle}>Foundations</CardTitle>
                  <CardDescription className={styles.sectionDescription}>
                    先看最底层的设计契约：语义 token、字体变量、卡片表面和阴影表达。这里的 raw probe 不经过组件封装，用来验证主题本身是否正确。
                  </CardDescription>
                </div>
              </CardHeader>
              <CardPanel className={styles.stack}>
                <div className={styles.buttonRow}>
                  <button
                    className="inline-flex items-center rounded-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs"
                    type="button"
                  >
                    Raw primary probe
                  </button>
                  <button
                    className="inline-flex items-center rounded-full border border-input bg-card px-4 py-2 text-sm font-medium text-foreground shadow-xs/5"
                    type="button"
                  >
                    Raw neutral probe
                  </button>
                  <span className="inline-flex items-center rounded-full bg-info/8 px-2 py-1 text-xs font-medium text-info-foreground">
                    Raw info badge
                  </span>
                </div>
                <Separator />
                <div className={styles.previewSwatches}>
                  <div className={styles.swatchCard}>
                    <div className={styles.swatchTitle}>Raw card</div>
                    <div className={styles.muted}>如果这张卡片看起来正常，说明 Tailwind v4 token 已经接通。</div>
                  </div>
                  <div className={styles.swatchCardMuted}>
                    <div className={styles.swatchTitle}>Token contract</div>
                    <div className={styles.muted}>统一走 `--font-sans`、`--font-heading`、`--font-mono` 和语义颜色，不直接写随机 HEX。</div>
                  </div>
                  <div className={styles.swatchCard}>
                    <div className={styles.swatchTitle}>Layering contract</div>
                    <div className={styles.muted}>`body.relative` 加上根节点 `isolate`，是 Dialog / Popover / Select 正常叠层的前提。</div>
                  </div>
                </div>
              </CardPanel>
            </Card>

            <Card>
              <CardHeader>
                <div className={styles.sectionHeader}>
                  <CardTitle className={styles.sectionTitle}>Primitive surface</CardTitle>
                  <CardDescription className={styles.sectionDescription}>
                    这块只看最常用的基础组件默认层级，后续业务页通常先从这些 primitive 开始组合。
                  </CardDescription>
                </div>
              </CardHeader>
              <CardPanel className={styles.stack}>
                <div className={styles.buttonRow}>
                  <Button>Primary action</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive-outline">Destructive</Button>
                  <Button loading>Loading</Button>
                </div>
                <div className={styles.buttonRow}>
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                </div>
              </CardPanel>
            </Card>

            <Card>
              <CardHeader>
                <div className={styles.sectionHeader}>
                  <CardTitle className={styles.sectionTitle}>Form patterns</CardTitle>
                  <CardDescription className={styles.sectionDescription}>
                    `Skills.md` 里最重要的一条就是不要孤立使用 Input，而是优先用 `Field + Label + Description/Error` 形成完整表单结构。
                  </CardDescription>
                </div>
              </CardHeader>
              <CardPanel>
                <div className={styles.formStudy}>
                  <Fieldset className={styles.fieldsetGroup}>
                    <FieldsetLegend>Structured field group</FieldsetLegend>
                    <Field>
                      <FieldLabel>Playground name</FieldLabel>
                      <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="给这个试验页起个名字"
                      />
                      <FieldDescription>Input 默认带边框、阴影和焦点 ring。</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>当前学习组件</FieldLabel>
                      <Select
                        value={selectedComponent}
                        onValueChange={(value) => setSelectedComponent(value ?? "button")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择一个组件" />
                        </SelectTrigger>
                        <SelectPopup>
                          {PLAYGROUND_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                      <FieldDescription>这里验证 Select 的 trigger、popup 和 item 结构。</FieldDescription>
                    </Field>
                  </Fieldset>

                  <Separator />

                  <Fieldset className={styles.fieldsetGroup}>
                    <FieldsetLegend>Feedback inside form</FieldsetLegend>
                    <Field>
                      <FieldLabel>Study notes</FieldLabel>
                      <Textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="记录你对组件视觉和交互的观察"
                      />
                      <FieldDescription>Textarea 也走同一套 control 包裹和 token 体系。</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>校验提示示例</FieldLabel>
                      <Input aria-invalid defaultValue="invalid@demo" />
                      <FieldError>这是一个 FieldError 示例，用来观察 destructive 反馈和状态边框。</FieldError>
                    </Field>
                  </Fieldset>
                </div>
              </CardPanel>
            </Card>

            <Card className={styles.tabsCard}>
              <CardHeader>
                <div className={styles.sectionHeaderInline}>
                  <div className={styles.sectionHeader}>
                    <CardTitle className={styles.sectionTitle}>Component scenarios</CardTitle>
                    <CardDescription className={styles.sectionDescription}>
                      不同组件该怎么落地到真实场景，这里按 `Skills.md` 里强调的“场景优先”方式做示例。
                    </CardDescription>
                  </div>
                  <CardAction>
                    <Badge variant="outline">default tokens</Badge>
                  </CardAction>
                </div>
              </CardHeader>
              <CardPanel>
                <Tabs defaultValue="overview">
                  <TabsList>
                    <TabsTab value="overview">Overview</TabsTab>
                    <TabsTab value="empty">Empty state</TabsTab>
                    <TabsTab value="tokens">Token notes</TabsTab>
                  </TabsList>
                  <TabsPanel value="overview" className={styles.tabsPanel}>
                    <div className={styles.previewSwatches}>
                      <div className={styles.swatch}>
                        <div className={styles.swatchTitle}>Opaque border</div>
                        <div className={styles.muted}>
                          coss 强调半透明边框叠阴影形成更清晰的轮廓。
                        </div>
                      </div>
                      <div className={styles.swatch}>
                        <div className={styles.swatchTitle}>Font contract</div>
                        <div className={styles.muted}>
                          `--font-sans`、`--font-heading`、`--font-mono`
                        </div>
                      </div>
                      <div className={styles.swatch}>
                        <div className={styles.swatchTitle}>Portal safety</div>
                        <div className={styles.muted}>
                          `body.relative` + root `isolate` 用来保证 Dialog / Select 叠层。
                        </div>
                      </div>
                    </div>
                  </TabsPanel>
                  <TabsPanel value="empty" className={styles.tabsPanel}>
                    <div className={styles.emptyWrap}>
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <LayoutTemplateIcon />
                          </EmptyMedia>
                          <EmptyTitle>还没有业务内容</EmptyTitle>
                          <EmptyDescription>
                            这个 Empty 只是展示默认视觉和标题层级，不绑定真实数据流。
                          </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          <Button variant="outline">Create block</Button>
                        </EmptyContent>
                      </Empty>
                    </div>
                  </TabsPanel>
                  <TabsPanel value="tokens" className={styles.tabsPanel}>
                    <Alert variant="success">
                      <CheckCircle2Icon />
                      <AlertTitle>当前 Playground 目标</AlertTitle>
                      <AlertDescription>
                        先学默认组件和主题，不急着把业务页换过去。等你确认喜欢哪一部分，再小范围迁移。
                      </AlertDescription>
                    </Alert>
                  </TabsPanel>
                </Tabs>
              </CardPanel>
            </Card>

            <Card>
              <CardHeader>
                <div className={styles.sectionHeaderInline}>
                  <div className={styles.sectionHeader}>
                    <CardTitle className={styles.sectionTitle}>Toolbar + table</CardTitle>
                    <CardDescription className={styles.sectionDescription}>
                      这块对应产品里最常见的“操作条 + 数据列表”组合。它不是一个大组件，而是几类 primitive 的稳定拼法。
                    </CardDescription>
                  </div>
                  <CardAction>
                    <Badge variant="outline">product shell</Badge>
                  </CardAction>
                </div>
              </CardHeader>
              <CardPanel className={styles.stack}>
                <Toolbar className={styles.toolbarDemo}>
                  <ToolbarGroup>
                    <ToolbarButton render={<Button size="sm" variant="secondary" />}>
                      <Settings2Icon />
                      Filters
                    </ToolbarButton>
                    <ToolbarButton render={<Button size="sm" variant="ghost" />}>
                      Export
                    </ToolbarButton>
                  </ToolbarGroup>
                  <ToolbarSeparator orientation="vertical" />
                  <ToolbarGroup>
                    <ToolbarButton render={<Button size="sm" variant="ghost" />}>
                      Compact
                    </ToolbarButton>
                    <ToolbarButton render={<Button size="sm" variant="ghost" />}>
                      Dense
                    </ToolbarButton>
                  </ToolbarGroup>
                </Toolbar>

                <div className={styles.tableShell}>
                  <div className={styles.tableMeta}>
                    <div className={styles.liveHeader}>
                      <Table2Icon />
                      <span>Component index sample</span>
                    </div>
                    <Badge variant="secondary">3 rows</Badge>
                  </div>
                  <Table>
                    <TableCaption>一个最小但接近真实产品的数据表展示例。</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead>Best for</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Dialog</TableCell>
                        <TableCell>完整确认流和需要聚焦的关键任务</TableCell>
                        <TableCell>
                          <Badge variant="success">ready</Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sheet</TableCell>
                        <TableCell>侧边设置、附属编辑、不中断主工作区</TableCell>
                        <TableCell>
                          <Badge variant="info">study</Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Drawer</TableCell>
                        <TableCell>移动端、边缘抽屉、短流程选择</TableCell>
                        <TableCell>
                          <Badge variant="warning">contextual</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardPanel>
            </Card>
          </div>

          <div className={styles.stack}>
            <Card>
              <CardHeader>
                <div className={styles.sectionHeaderInline}>
                  <div className={styles.sectionHeader}>
                    <CardTitle className={styles.sectionTitle}>AI conversation panel</CardTitle>
                    <CardDescription className={styles.sectionDescription}>
                      这是一套按当前 coss 规范拼出来的用户与 AI Agent 对话框。重点不是“聊天感”，而是消息层级、状态信息、建议动作和输入区的产品化结构。
                    </CardDescription>
                  </div>
                  <CardAction>
                    <Badge variant="success">conversation</Badge>
                  </CardAction>
                </div>
              </CardHeader>
              <CardPanel className={styles.stack}>
                <div className={styles.chatShell}>
                  <div className={styles.chatHeader}>
                    <div className={styles.chatMeta}>
                      <div className={styles.liveHeader}>
                        <BotIcon />
                        <span>AI Agent thread</span>
                      </div>
                      <div className={styles.muted}>保留消息时间、角色和状态，让对话更像工作流面板，而不是纯社交聊天窗口。</div>
                    </div>
                    <div className={styles.buttonRow}>
                      <Badge variant="outline">stream-ready layout</Badge>
                      <Badge variant="info">coss primitives</Badge>
                    </div>
                  </div>

                  <div className={styles.chatSuggestions}>
                    <Button variant="ghost" size="sm" onClick={() => setPromptDraft("请给我 3 种更专业的 header 结构方案。")}>
                      Header ideas
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPromptDraft("帮我重排表单区和预览区的信息层级。")}>
                      Layout critique
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPromptDraft("只调整 UI，不碰导出逻辑。")}>
                      Safe refactor
                    </Button>
                  </div>

                  <div className={styles.chatViewport}>
                    <ScrollArea className={styles.chatScroll} scrollFade>
                      <div className={styles.chatMessages}>
                        {conversation.map((message) => (
                          <div
                            key={message.id}
                            className={
                              message.role === "agent"
                                ? styles.messageRowAgent
                                : styles.messageRowUser
                            }
                          >
                            <Avatar className={styles.messageAvatar}>
                              <AvatarFallback>
                                {message.role === "agent" ? <BotIcon /> : <UserIcon />}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={
                                message.role === "agent"
                                  ? styles.messageBubbleAgent
                                  : styles.messageBubbleUser
                              }
                            >
                              <div className={styles.messageTopline}>
                                <span className={styles.messageTitle}>{message.title}</span>
                                <span className={styles.messageMeta}>{message.meta}</span>
                              </div>
                              <p className={styles.messageBody}>{message.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <form className={styles.chatComposer} onSubmit={handleConversationSubmit}>
                    <InputGroup className={styles.chatInputGroup}>
                      <InputGroupAddon align="block-start">
                        <InputGroupText>Prompt</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupTextarea
                        value={promptDraft}
                        onChange={(event) => setPromptDraft(event.target.value)}
                        placeholder="输入你想让 Agent 执行或分析的任务"
                        rows={4}
                      />
                      <InputGroupAddon align="block-end" className={styles.chatComposerFooter}>
                        <div className={styles.chatComposerMeta}>
                          <span className={styles.muted}>推荐保留上下文说明、动作目标和范围限制</span>
                        </div>
                        <Button type="submit">
                          <SendHorizontalIcon />
                          Send to agent
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                  </form>
                </div>

                <div className={styles.ruleList}>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>Message row</span>
                    <span className={styles.ruleValue}>头像、角色名、状态元信息和内容分层展示，不把一切都塞进纯文字气泡。</span>
                  </div>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>Composer</span>
                    <span className={styles.ruleValue}>输入区用 InputGroup / Textarea 组合，天然适合挂提示、快捷动作和发送按钮。</span>
                  </div>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>Suggestions</span>
                    <span className={styles.ruleValue}>把常见提示词做成轻量 action，降低用户启动对话的成本。</span>
                  </div>
                </div>
              </CardPanel>
            </Card>

            <Card>
              <CardHeader>
                <div className={styles.sectionHeaderInline}>
                  <div className={styles.sectionHeader}>
                    <CardTitle className={styles.sectionTitle}>Trigger composition</CardTitle>
                    <CardDescription className={styles.sectionDescription}>
                      `Skills.md` 的核心规则之一是用 `render` 组合触发器，不再走旧的 `asChild` 思路。这里把 Dialog 和 Popover 放在一起观察。
                    </CardDescription>
                  </div>
                  <CardAction>
                    <Badge variant="success">render prop</Badge>
                  </CardAction>
                </div>
              </CardHeader>
              <CardPanel className={styles.stack}>
                <div className={styles.buttonRow}>
                  <Dialog>
                    <DialogTrigger render={<Button />}>Dialog trigger</DialogTrigger>
                    <DialogPopup>
                      <DialogHeader>
                        <DialogTitle>Dialog structure</DialogTitle>
                        <DialogDescription>
                          Header / Panel / Footer 三段式是这套组件的推荐结构。
                        </DialogDescription>
                      </DialogHeader>
                      <DialogPanel className={styles.stackSm}>
                        <Alert variant="info">
                          <SparklesIcon />
                          <AlertTitle>Overlay sample</AlertTitle>
                          <AlertDescription>这里主要看触发器、面板和操作区的关系。</AlertDescription>
                        </Alert>
                      </DialogPanel>
                      <DialogFooter>
                        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
                        <Button>Primary action</Button>
                      </DialogFooter>
                    </DialogPopup>
                  </Dialog>

                  <Popover>
                    <PopoverTrigger render={<Button variant="outline" />}>
                      Popover trigger
                    </PopoverTrigger>
                    <PopoverPopup className={styles.popoverDemo}>
                      <div className={styles.stackSm}>
                        <PopoverTitle>Popover pattern</PopoverTitle>
                        <PopoverDescription>
                          比起大弹窗，Popover 更适合轻量操作、上下文解释和附加设置。
                        </PopoverDescription>
                        <Separator />
                        <div className={styles.footerNote}>
                          <span>Rule</span>
                          <span>小而快，不承载冗长流程</span>
                        </div>
                      </div>
                    </PopoverPopup>
                  </Popover>
                </div>
                <div className={styles.ruleList}>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>Trigger</span>
                    <span className={styles.ruleValue}>统一用 `render` 组合 Button 和 overlay trigger</span>
                  </div>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>Dialog</span>
                    <span className={styles.ruleValue}>`Header / Panel / Footer`，取消操作优先 `ghost`</span>
                  </div>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>Popover</span>
                    <span className={styles.ruleValue}>适合短内容和轻量动作，不抢主流程</span>
                  </div>
                </div>
              </CardPanel>
            </Card>

            <Card>
              <CardHeader>
                <div className={styles.sectionHeader}>
                  <CardTitle className={styles.sectionTitle}>Feedback + empty states</CardTitle>
                  <CardDescription className={styles.sectionDescription}>
                    这两类组件在产品页里使用频率很高，一个负责反馈当前操作结果，一个负责处理没有数据时的界面节奏。
                  </CardDescription>
                </div>
              </CardHeader>
              <CardPanel className={styles.stack}>
                <div className={styles.alertStack}>
                  <Alert variant="info">
                    <PaletteIcon />
                    <AlertTitle>Info</AlertTitle>
                    <AlertDescription>适合做说明性信息和轻量提示。</AlertDescription>
                  </Alert>
                  <Alert variant="warning">
                    <AlertCircleIcon />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>适合做校验、潜在风险和未完成提醒。</AlertDescription>
                  </Alert>
                  <Alert variant="success">
                    <CheckCircle2Icon />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>适合反馈保存成功、同步完成或导出完成。</AlertDescription>
                  </Alert>
                </div>
                <div className={styles.emptyWrap}>
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <LayoutTemplateIcon />
                      </EmptyMedia>
                      <EmptyTitle>还没有业务内容</EmptyTitle>
                      <EmptyDescription>
                        Empty 负责提供清晰的下一步动作，而不是只留一块空白区域。
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button variant="outline">Create block</Button>
                    </EmptyContent>
                  </Empty>
                </div>
              </CardPanel>
            </Card>

            <Card>
              <CardHeader>
                <div className={styles.sectionHeaderInline}>
                  <div className={styles.sectionHeader}>
                    <CardTitle className={styles.sectionTitle}>Overlay alternatives</CardTitle>
                    <CardDescription className={styles.sectionDescription}>
                      这一块专门用来对比 Dialog 之外的几种覆盖层。它们都能承载内容，但使用场景完全不同。
                    </CardDescription>
                  </div>
                  <CardAction>
                    <Badge variant="info">scenario-first</Badge>
                  </CardAction>
                </div>
              </CardHeader>
              <CardPanel className={styles.stack}>
                <div className={styles.buttonRow}>
                  <Sheet>
                    <SheetTrigger render={<Button variant="secondary" />}>
                      <PanelRightOpenIcon />
                      Open sheet
                    </SheetTrigger>
                    <SheetPopup side="right">
                      <SheetHeader>
                        <SheetTitle>Sheet pattern</SheetTitle>
                        <SheetDescription>
                          Sheet 更接近侧边工作面板，适合承载上下文编辑、附加设置和不中断主视图的任务。
                        </SheetDescription>
                      </SheetHeader>
                      <SheetPanel>
                        <div className={styles.stackSm}>
                          <Alert variant="info">
                            <Settings2Icon />
                            <AlertTitle>Use case</AlertTitle>
                            <AlertDescription>例如右侧配置栏、筛选器或二级编辑器。</AlertDescription>
                          </Alert>
                        </div>
                      </SheetPanel>
                      <SheetFooter>
                        <Button variant="ghost">Cancel</Button>
                        <Button>Apply</Button>
                      </SheetFooter>
                    </SheetPopup>
                  </Sheet>

                  <Drawer position="bottom">
                    <DrawerTrigger render={<Button variant="outline" />}>
                      <PanelBottomOpenIcon />
                      Open drawer
                    </DrawerTrigger>
                    <DrawerPopup position="bottom" showBar>
                      <DrawerHeader>
                        <DrawerTitle>Drawer pattern</DrawerTitle>
                        <DrawerDescription>
                          Drawer 更偏移动端或临时流程。它强调从边缘滑出，适合操作列表、确认流或短流程选择。
                        </DrawerDescription>
                      </DrawerHeader>
                      <DrawerPanel>
                        <div className={styles.stackSm}>
                          <Alert variant="warning">
                            <AlertCircleIcon />
                            <AlertTitle>Use case</AlertTitle>
                            <AlertDescription>例如移动端 action sheet、短确认流、轻量筛选步骤。</AlertDescription>
                          </Alert>
                        </div>
                      </DrawerPanel>
                      <DrawerFooter>
                        <Button variant="ghost">Not now</Button>
                        <Button>Confirm</Button>
                      </DrawerFooter>
                    </DrawerPopup>
                  </Drawer>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger render={<Button variant="ghost" />}>
                        Hover tooltip
                      </TooltipTrigger>
                      <TooltipPopup>
                        Tooltip 只做超轻量说明，不承载复杂内容。
                      </TooltipPopup>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className={styles.ruleList}>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>Sheet</span>
                    <span className={styles.ruleValue}>更像产品里的侧边面板，适合桌面端持续编辑。</span>
                  </div>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>Drawer</span>
                    <span className={styles.ruleValue}>更适合移动端、短流程和从边缘拉出的操作面板。</span>
                  </div>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>Tooltip</span>
                    <span className={styles.ruleValue}>只负责极短提示，不替代说明区或弹窗内容。</span>
                  </div>
                </div>
              </CardPanel>
            </Card>

            <Card>
              <CardHeader>
                <div className={styles.sectionHeader}>
                  <CardTitle className={styles.sectionTitle}>Migration crib sheet</CardTitle>
                  <CardDescription className={styles.sectionDescription}>
                    这是把 `Skills.md` 里和迁移最相关的规则压缩成一个面板，后面你把正式页往 coss 迁时可以直接对照。
                  </CardDescription>
                </div>
              </CardHeader>
              <CardPanel className={styles.stack}>
                <div className={styles.ruleList}>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>`asChild`</span>
                    <span className={styles.ruleValue}>迁成 `render`，让触发器和按钮以组件组合方式连接</span>
                  </div>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>Field</span>
                    <span className={styles.ruleValue}>不要裸用 Input，优先补齐 label、description、error</span>
                  </div>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>Select</span>
                    <span className={styles.ruleValue}>按 items-first 模式组织 option，不沿用旧的菜单心智</span>
                  </div>
                  <div className={styles.ruleRow}>
                    <span className={styles.ruleLabel}>Theme</span>
                    <span className={styles.ruleValue}>所有组件优先吃 token，不在业务页里散落颜色实现</span>
                  </div>
                </div>
                <Separator />
                <div className={styles.liveCard}>
                  <div className={styles.liveHeader}>
                    <Layers3Icon />
                    <span>当前 playground 状态</span>
                  </div>
                  <div className={styles.footerNote}>
                    <span>Selected component</span>
                    <strong>{selectedComponent}</strong>
                  </div>
                  <div className={styles.footerNote}>
                    <span>Playground name</span>
                    <strong>{name}</strong>
                  </div>
                  <div className={styles.muted}>{notes}</div>
                </div>
                <Button render={<Link href="/playground" />} variant="secondary">
                  重新查看本页
                  <ChevronRightIcon />
                </Button>
                <Button variant="outline">
                  <Settings2Icon />
                  后续可以继续加 Sheet / Drawer / Table / Toolbar
                </Button>
              </CardPanel>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
