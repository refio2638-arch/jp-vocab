个人日语背单词站（本地 localStorage，无账号）。

## 词库数据

N5–N1 词表转换自 [OpenJLPT](https://github.com/evanclan/OpenJLPT) 的公开词汇 JSON。这是社区整理的学习词表，**不是 JLPT 官方词表**。

重新拉取并转换：

```bash
npm run import:jlpt
```

若 GitHub 下载失败，把 `n5.json` … `n1.json` 放到 `scripts/raw/` 后再跑同一条命令。

中文释义是离线批量补上的，复习页不会请求翻译接口。先导入，再补中文：

```bash
node scripts/fill-zh.mjs --level N5
node scripts/fill-zh.mjs --level N4
# …N3 N2 N1，或不加 --level 一次跑完
```

中文释义优先从开源日中词库 [Japanese-Chinese-thesaurus](https://github.com/lxl66566/Japanese-Chinese-thesaurus)（Unlicense）按汉字/假名合并；对不上的词仍显示英文。例句中文需要 `DEEPSEEK_API_KEY` 再跑 `fill-zh` 补全。已有非空 `meaningZh` 不会被覆盖。

英语 CET4 / CET6 / 考研词表从 `scripts/raw/en/{cet4,cet6,kaoyan}.txt` 转换（每行 `word<TAB>中文释义`）：

```bash
npm run import:en
```

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
