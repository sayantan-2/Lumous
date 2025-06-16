import { motion } from 'framer-motion';
import { FolderOpen, Image, Sparkles } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useGalleryStore } from '../store/galleryStore';

export function WelcomeScreen() {
  const { scanFolder } = useGalleryStore();

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      
      if (selected && typeof selected === 'string') {
        await scanFolder(selected);
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <motion.div
        className="text-center max-w-md mx-auto p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="mb-8"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="relative">
            <Image className="w-20 h-20 mx-auto text-primary mb-4" />
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity }
              }}
            >
              <Sparkles className="w-6 h-6 text-yellow-500" />
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          className="text-3xl font-bold text-foreground mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Welcome to Modern Gallery
        </motion.h1>

        <motion.p
          className="text-muted-foreground mb-8 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          A beautiful, fast, and feature-rich image gallery application. 
          Organize, browse, and enjoy your photo collection with modern tools and native performance.
        </motion.p>

        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <button
            onClick={handleOpenFolder}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <FolderOpen className="w-5 h-5" />
            Open Folder to Get Started
          </button>

          <div className="text-xs text-muted-foreground">
            Supports JPG, PNG, GIF, TIFF, WebP, HEIC, RAW, and more
          </div>
        </motion.div>

        <motion.div
          className="mt-12 grid grid-cols-3 gap-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {[
            { title: "Fast Browsing", desc: "Smooth scrolling with virtual rendering" },
            { title: "EXIF Data", desc: "View detailed photo metadata" },
            { title: "Multiple Views", desc: "Grid, masonry, and list layouts" }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              className="p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + index * 0.2 }}
            >
              <h3 className="font-medium text-sm text-foreground mb-2">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
