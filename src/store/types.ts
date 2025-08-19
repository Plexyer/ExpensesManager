import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

export const useAppDispatch: () => AppDispatch = useDispatch as unknown as () => AppDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;


