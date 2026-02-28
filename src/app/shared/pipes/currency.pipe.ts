import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../../core/services';

@Pipe({ name: 'uzsFormat', standalone: true })
export class UzsFormatPipe implements PipeTransform {
  constructor(private readonly currencyService: CurrencyService) {}

  transform(value: number): string {
    return this.currencyService.formatUZS(value);
  }
}

@Pipe({ name: 'usdFormat', standalone: true })
export class UsdFormatPipe implements PipeTransform {
  constructor(private readonly currencyService: CurrencyService) {}

  transform(value: number): string {
    return this.currencyService.formatUSD(value);
  }
}

@Pipe({ name: 'toUsd', standalone: true })
export class ToUsdPipe implements PipeTransform {
  constructor(private readonly currencyService: CurrencyService) {}

  transform(uzsValue: number): number {
    return this.currencyService.toUSD(uzsValue);
  }
}
