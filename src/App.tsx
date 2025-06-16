import { useEffect } from 'react';
import { useGalleryStore } from './store/galleryStore';
import { Sidebar } from './components/Sidebar';
import { Gallery } from './components/Gallery';
import { ImageViewer } from './components/ImageViewer';
import { Toolbar } from './components/Toolbar';
import { WelcomeScreen } from './components/WelcomeScreen';
import './globals.css';

function App() {
  const { currentFolder, isFullscreen, currentImageIndex, loadRecentFolders } = useGalleryStore();

  useEffect(() => {
    loadRecentFolders();
  }, [loadRecentFolders]);

  if (isFullscreen && currentImageIndex >= 0) {
    return <ImageViewer />;
  }
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Toolbar />
        <div className="flex-1 min-h-0">
          {currentFolder ? <Gallery /> : <WelcomeScreen />}
        </div>
      </div>
    </div>
  );
}

export default App;
