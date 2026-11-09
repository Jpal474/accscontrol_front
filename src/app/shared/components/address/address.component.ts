import { Component, inject, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { CatalogSelectComponent } from '../catalog-select/catalog-select.component';
import { CatalogsService } from '../../services/catalogs.service';
import { CatalogApiResponse } from '../../interfaces/catalogs.interface';
import { ApiStandardResponse } from '../../interfaces/api-response.interface';

@Component({
  selector: 'app-address',
  standalone: true,
  imports: [ReactiveFormsModule, CatalogSelectComponent],
  templateUrl: './address.component.html',
  styleUrl: './address.component.scss',
})
export class AddressComponent {
  private readonly catalogService = inject(CatalogsService);

  readonly prefix = input.required<string>();
  readonly title = input('Dirección');
  readonly form = input.required<FormGroup>();

  // 1. País
  readonly fetchCountries = (q: any) => this.catalogService.getCountries(q);

  // 2. Estados: Obtiene el countryId actual del formulario y lo pasa
  readonly fetchStates = (q: any) => {
    const countryId = this.form().get('countryId')?.value;
    return this.catalogService.getStatesByCountry(countryId, q);
  };

  // 3. Municipios: Obtiene el stateId actual del formulario y lo pasa
  readonly fetchMunicipalities = (q: any) => {
    const stateId = this.form().get('stateId')?.value;
    return this.catalogService.getMunicipalitiesByState(stateId, q);
  };

  // 4. Localidades: Obtiene el municipalityId actual del formulario y lo pasa
  readonly fetchLocalities = (q: any) => {
    const municipalityId = this.form().get('municipalityId')?.value;
    return this.catalogService.getLocalitiesByMunicipality(municipalityId, q);
  };
}
