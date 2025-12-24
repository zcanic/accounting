import { createContext, useContext, useState } from 'react';

const DragContext = createContext({
  isDragging: false,
  setIsDragging: () => {},
  draggedItem: null,
  setDraggedItem: () => {},
});

export const DragProvider = ({ children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  return (
    <DragContext.Provider value={{ isDragging, setIsDragging, draggedItem, setDraggedItem }}>
      {children}
    </DragContext.Provider>
  );
};

export const useDraggable = () => useContext(DragContext);

export default DragContext;
