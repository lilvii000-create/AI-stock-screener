
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // 為 GitHub Pages 部署新增 'base' 選項。
  // 已將此處更新為符合您 package.json 中的專案名稱。
  // 請確認 'AI-stock-screener' 是您 GitHub 儲存庫的正確名稱。
  base: '/AI-stock-screener/',
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})