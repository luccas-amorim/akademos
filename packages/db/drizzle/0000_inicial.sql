CREATE TABLE `aluno` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`matricula` text,
	`curso_id` text NOT NULL,
	`matriz_id` text NOT NULL,
	`ingresso` text NOT NULL,
	`apagado` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cursada` (
	`id` text PRIMARY KEY NOT NULL,
	`aluno_id` text NOT NULL,
	`disciplina_codigo` text NOT NULL,
	`semestre` text NOT NULL,
	`nota` real,
	`frequencia` real,
	`situacao` text NOT NULL,
	`apagado` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cursada_aluno_idx` ON `cursada` (`aluno_id`);--> statement-breakpoint
CREATE TABLE `curso` (
	`id` text PRIMARY KEY NOT NULL,
	`instituicao_id` text NOT NULL,
	`nome` text NOT NULL,
	`grau` text NOT NULL,
	FOREIGN KEY (`instituicao_id`) REFERENCES `instituicao`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `diario` (
	`id` text PRIMARY KEY NOT NULL,
	`aluno_id` text NOT NULL,
	`data` text NOT NULL,
	`texto` text NOT NULL,
	`humor` integer,
	`apagado` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `disciplina` (
	`codigo` text NOT NULL,
	`matriz_id` text NOT NULL,
	`nome` text NOT NULL,
	`creditos` integer NOT NULL,
	`carga_horaria` integer NOT NULL,
	`semestre_sugerido` integer NOT NULL,
	`area` text NOT NULL,
	`tipo` text NOT NULL,
	`periodicidade` text DEFAULT 'ambos' NOT NULL,
	`codigos_alternativos` text DEFAULT '[]' NOT NULL,
	PRIMARY KEY(`matriz_id`, `codigo`),
	FOREIGN KEY (`matriz_id`) REFERENCES `matriz`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `escala` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`min` real NOT NULL,
	`max` real NOT NULL,
	`aprovacao` real NOT NULL,
	`frequencia_minima` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `insight_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`tipo` text NOT NULL,
	`alvo` text NOT NULL,
	`severidade` text NOT NULL,
	`texto` text NOT NULL,
	`motivo` text NOT NULL,
	`fonte` text NOT NULL,
	`calculado_em` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `instituicao` (
	`id` text PRIMARY KEY NOT NULL,
	`sigla` text NOT NULL,
	`nome` text NOT NULL,
	`escala_id` text NOT NULL,
	`sistema` text NOT NULL,
	`creditos_max_semestre` integer NOT NULL,
	`grade_dias` text NOT NULL,
	`grade_faixas` text NOT NULL,
	FOREIGN KEY (`escala_id`) REFERENCES `escala`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `marco` (
	`id` text PRIMARY KEY NOT NULL,
	`aluno_id` text NOT NULL,
	`semestre` text NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`feito` integer NOT NULL,
	`apagado` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `matriz` (
	`id` text PRIMARY KEY NOT NULL,
	`curso_id` text NOT NULL,
	`ano` integer NOT NULL,
	`creditos_total` integer NOT NULL,
	`versao_registro` text NOT NULL,
	FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `_meta` (
	`chave` text PRIMARY KEY NOT NULL,
	`valor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `objetivo` (
	`id` text PRIMARY KEY NOT NULL,
	`aluno_id` text NOT NULL,
	`titulo` text NOT NULL,
	`principal` integer NOT NULL,
	`competencias` text NOT NULL,
	`apagado` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oferta` (
	`id` text PRIMARY KEY NOT NULL,
	`semestre` text NOT NULL,
	`disciplina_codigo` text NOT NULL,
	`turma` text NOT NULL,
	`titulo` text,
	`professor` text,
	`local` text,
	`vagas` integer NOT NULL,
	`interessados` integer NOT NULL,
	`horarios` text NOT NULL,
	`atualizada_em` text,
	`apagado` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `oferta_semestre_idx` ON `oferta` (`semestre`);--> statement-breakpoint
CREATE TABLE `_ops` (
	`hlc` text NOT NULL,
	`tabela` text NOT NULL,
	`linha_id` text NOT NULL,
	`coluna` text NOT NULL,
	`valor` text NOT NULL,
	`origem` text NOT NULL,
	PRIMARY KEY(`tabela`, `linha_id`, `coluna`, `hlc`)
);
--> statement-breakpoint
CREATE INDEX `ops_hlc_idx` ON `_ops` (`hlc`);--> statement-breakpoint
CREATE TABLE `plano` (
	`id` text PRIMARY KEY NOT NULL,
	`aluno_id` text NOT NULL,
	`semestre` text NOT NULL,
	`turmas` text NOT NULL,
	`criado_em` text NOT NULL,
	`apagado` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prerequisito` (
	`matriz_id` text NOT NULL,
	`disciplina_codigo` text NOT NULL,
	`requer_codigo` text NOT NULL,
	`tipo` text DEFAULT 'pre' NOT NULL,
	PRIMARY KEY(`matriz_id`, `disciplina_codigo`, `requer_codigo`),
	FOREIGN KEY (`matriz_id`) REFERENCES `matriz`(`id`) ON UPDATE no action ON DELETE cascade
);
