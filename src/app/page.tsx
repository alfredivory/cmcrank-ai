export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            CMCRank<span className="text-blue-400">.ai</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Track cryptocurrency performance through CoinMarketCap ranking over time.
            AI-powered research reveals what drives token performance.
          </p>
          <p className="mt-4 text-gray-400 italic">
            Price tells you what happened to one token. 
            <span className="text-blue-400 font-semibold"> Rank tells you how it performed against everyone else.</span>
          </p>
        </div>

        {/* Status Card */}
        <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-semibold">System Online</span>
          </div>
          
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Environment</span>
              <span className="text-white">{process.env.NODE_ENV || 'development'}</span>
            </div>
            <div className="flex justify-between">
              <span>Database</span>
              <span className="text-yellow-400">Pending Setup</span>
            </div>
            <div className="flex justify-between">
              <span>CMC API</span>
              <span className="text-yellow-400">Configured</span>
            </div>
            <div className="flex justify-between">
              <span>AI Research</span>
              <span className="text-yellow-400">Configured</span>
            </div>
          </div>
        </div>

        {/* Coming Soon Features */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold mb-8 text-gray-300">Coming Soon</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <FeatureCard 
              title="Rank Charts" 
              description="Interactive rank trajectory charts with overlays for price, market cap, and volume"
              icon="📈"
            />
            <FeatureCard 
              title="AI Research" 
              description="Investigate what events caused rank changes with AI-powered analysis"
              icon="🔍"
            />
            <FeatureCard 
              title="Compare Tokens" 
              description="Side-by-side comparison of token rank performance"
              icon="⚖️"
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-gray-500 text-sm">
          <p>Built with 🎩 by Alfred Ivory</p>
          <p className="mt-1">
            <a 
              href="https://github.com/alfredivory/cmcrank-ai" 
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50 hover:border-blue-500/50 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
