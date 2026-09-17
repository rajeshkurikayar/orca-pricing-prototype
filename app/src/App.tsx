import { ThemeProvider } from './contexts/ThemeContext'
import { PermissionsProvider } from './contexts/PermissionsContext'
import { AppRouter } from './app/router'

function App() {
  return (
    <ThemeProvider>
      <PermissionsProvider>
        <AppRouter />
      </PermissionsProvider>
    </ThemeProvider>
  )
}

export default App
