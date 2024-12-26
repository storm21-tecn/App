import React, { useState, useEffect, useMemo, useCallback } from 'react';

const SearchResults = ({
  aramaSonuçları,
  status,
  type,
  seçiliİşlemler,
  setSelectedTransactions,
  previousUse,
  lastSearchType,
  shouldShowLoadingState,
  setShouldShowStatusBarLoading,
  turnOffMobileSelectionMode,
  clearSelectedTransactions,
  isFocused,
  isSearchResultsEmpty,
  previousIsSearchResultEmpty,
}) => {
  // Arama sonuçlarının boş olup olmadığını kontrol et
  const searchResultsEmpty = !aramaSonuçları?.veri || SearchUIUtils.AramaSonuçlarıBoş(aramaSonuçları);
  const previousSearchResultEmpty = previousUse(searchResultsEmpty);

  // Verilerin düzenlenmesi için useMemo kullanımı
  const data = useMemo(() => {
    if (!aramaSonuçları) return [];
    return SearchUIUtils.getSections(type, status, aramaSonuçları.data, aramaSonuçları.search);
  }, [aramaSonuçları, status, type]);

  // Yüklenme durumu için useEffect
  useEffect(() => {
    if (shouldShowLoadingState && lastSearchType !== type) {
      setShouldShowStatusBarLoading(true);
    }
  }, [lastSearchType, setShouldShowStatusBarLoading, shouldShowLoadingState, type]);

  // Seçilen işlemleri güncelleme işlemi
  const handleSelectedTransactions = useCallback(() => {
    const newTransactionList = {};

    if (status === CONST.SEARCH.STATUS.EXPENSE.ALL) {
      data.forEach((transaction) => {
        if (!transaction?.işlemKimliği || !seçiliİşlemler[transaction.işlemKimliği]) return;
        newTransactionList[transaction.işlemKimliği] = {
          action: transaction.eylem,
          canHold: transaction.tutabilir,
          isOnHold: TransactionUtils.isNotOnHold(transaction),
          isNotHoldable: transaction.tutulmuyor,
          selected: seçiliİşlemler[transaction.işlemKimliği]?.seçildi,
          canDelete: transaction.canDelete,
          reportId: transaction.raporKimliği,
          policyId: transaction.politikaKimliği,
          amount: transaction.değiştirilmişTutar ?? transaction.tutar,
        };
      });
    } else {
      data.forEach((report) => {
        report.transactions?.forEach((transaction) => {
          if (!transaction?.işlemKimliği || !seçiliİşlemler[transaction.işlemKimliği]) return;
          newTransactionList[transaction.işlemKimliği] = {
            action: transaction.eylem,
            canHold: transaction.tutabilir,
            isOnHold: TransactionUtils.isOnHold(transaction),
            cannotHold: transaction.tutamaz,
            selected: seçiliİşlemler[transaction.işlemKimliği]?.seçili,
            canDelete: transaction.silinebilir,
            reportId: transaction.raporKimliği,
            policyId: transaction.politikaKimliği,
            amount: transaction.değiştirilmişTutar ?? transaction.tutar,
          };
        });
      });
    }

    setSelectedTransactions(newTransactionList, data);
  }, [data, status, seçiliİşlemler, setSelectedTransactions]);

  useEffect(() => {
    handleSelectedTransactions();
  }, [data, handleSelectedTransactions]);

  // Mobil seçim modunu kapatma
  useEffect(() => {
    if (isSearchResultsEmpty || previousIsSearchResultEmpty) return;
    turnOffMobileSelectionMode();
  }, [isSearchResultsEmpty, previousIsSearchResultEmpty, turnOffMobileSelectionMode]);

  // Temizleme işlemi
  useEffect(() => {
    return () => {
      if (isFocused) return;
      clearSelectedTransactions();
      turnOffMobileSelectionMode();
    };
  }, [isFocused, clearSelectedTransactions, turnOffMobileSelectionMode]);

  // Yükleniyor durumu
  if (shouldShowLoadingState) {
    return <SearchRowSkeleton shouldAnimate={true} containerStyle={styles.searchListContentContainerStyles} />;
  }

  // Veriler yoksa hata durumu
  if (!aramaSonuçları) {
    Log.alert('[Search] Undefined search type');
    return <FullPageOfflineBlockingView>{null}</FullPageOfflineBlockingView>;
  }

  // Liste elemanları ve sıralama
  const ListItem = SearchUIUtils.getListItem(type, status);
  const sortedData = SearchUIUtils.getSortedSections(type, status, data, sorting, sortingOrder);
  const isChat = type === CONST.SEARCH.DATA_TYPES.CHAT;

  const selectedSortedData = sortedData.map((item) => {
    const baseKey = isChat ? item.policyId : item.transactionId; // Bu mantığı gözden geçirin
    return {
      baseKey,
      // Diğer dönüşümler...
    };
  });

  return (
    <div>
      {/* Render edilen liste ve elemanlar */}
    </div>
  );
};

export default SearchResults;
