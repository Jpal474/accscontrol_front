import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SelectedStoreService } from '../services/selected-store.service';

export const storeInterceptor: HttpInterceptorFn = (req, next) => {
  const selectedStoreService = inject(SelectedStoreService);
  const activeStoreId = selectedStoreService.selectedStoreId();

  if (activeStoreId) {
    const clonedReq = req.clone({
      setHeaders: {
        'x-store-id': activeStoreId,
      },
    });
    return next(clonedReq);
  }

  return next(req);
};
