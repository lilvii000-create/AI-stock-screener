
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // 為 GitHub Pages 部署新增 'base' 選項。
  // 請確認 'ai-stock-screener-tw' 是您 GitHub 儲存庫的正確名稱。
  base: '/ai-stock-screener-tw/',
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})
